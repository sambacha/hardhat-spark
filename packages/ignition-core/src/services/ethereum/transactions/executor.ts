import { defaultAbiCoder as abiCoder } from "@ethersproject/abi";
import {
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/abstract-provider";
import { Namespace } from "cls-hooked";
import { BigNumber, providers } from "ethers";

import {
  AfterCompileEvent,
  AfterDeployEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  ContractBinding,
  ContractEvent,
  Deployed,
  Event,
  EventType,
  ModuleConfig,
  ModuleEvent,
  OnChangeEvent,
  StatefulEvent,
  TransactionData,
} from "../../../interfaces/hardhat-ignition";
import { Batcher } from "../../modules/events/batcher";
import { EventHandler } from "../../modules/events/handler";
import { ModuleResolver } from "../../modules/module-resolver";
import { ModuleStateRepo } from "../../modules/states/repo/state-repo";
import {
  CliError,
  ContractTypeMismatch,
  ContractTypeUnsupported,
  JsonFragment,
  JsonFragmentType,
  MissingAbiInContractError,
  NoContractBindingDataInModuleState,
  TransactionFailed,
} from "../../types";
import { ModuleState } from "../../types/module";
import { ClsNamespaces } from "../../utils/continuation-local-storage";
import { ILogging } from "../../utils/logging";
import { checkIfExist } from "../../utils/util";

import { EventTxExecutor } from "./event-executor";
import { ITransactionGenerator } from "./index";

const CONSTRUCTOR_TYPE = "constructor";

export class TxExecutor {
  private static async _handleEvent(
    event: Event,
    element: StatefulEvent,
    currentBatch: number,
    batches: any[],
    moduleState: ModuleState,
    elementsBatches: any
  ) {
    switch (event.eventType) {
      case EventType.AFTER_DEPLOY_EVENT: {
        await Batcher.handleAfterDeployEvent(
          event as AfterDeployEvent,
          element,
          batches,
          elementsBatches
        );
        break;
      }
      case EventType.ON_CHANGE_EVENT: {
        await Batcher.handleOnChangeEvent(
          event as OnChangeEvent,
          element,
          batches,
          elementsBatches
        );
        break;
      }
      case EventType.BEFORE_COMPILE_EVENT: {
        await Batcher.handleBeforeCompileEvent(
          event as BeforeCompileEvent,
          element,
          batches,
          elementsBatches
        );
        break;
      }
      case EventType.BEFORE_DEPLOY_EVENT:
      case EventType.AFTER_COMPILE_EVENT: {
        await Batcher.handleCompiledEvent(
          event as BeforeDeployEvent,
          element,
          batches,
          elementsBatches
        );
        break;
      }
      case EventType.ON_START:
      case EventType.ON_COMPLETION:
      case EventType.ON_FAIL:
      case EventType.ON_SUCCESS: {
        await Batcher.handleModuleEvent(event as ModuleEvent, element, batches);
        break;
      }
      default: {
        throw new CliError(
          `Failed to match event type with user event hooks - ${event.eventType}`
        );
      }
    }
  }

  private readonly _networkId: string;
  private readonly _parallelize: boolean;

  private _logger: ILogging;
  private _moduleStateRepo: ModuleStateRepo;
  private _txGenerator: ITransactionGenerator;
  private _ethers: providers.JsonRpcProvider;
  private _eventHandler: EventHandler;
  private _eventSession: Namespace;
  private _eventTxExecutor: EventTxExecutor;
  private readonly _blockConfirmation: number;

  constructor(
    logger: ILogging,
    moduleStateRepo: ModuleStateRepo,
    txGenerator: ITransactionGenerator,
    networkId: string,
    provider: providers.JsonRpcProvider,
    eventHandler: EventHandler,
    eventSession: Namespace,
    eventTxExecutor: EventTxExecutor,
    parallelize: boolean = false
  ) {
    this._logger = logger;
    this._moduleStateRepo = moduleStateRepo;
    this._txGenerator = txGenerator;

    this._ethers = provider;
    this._eventHandler = eventHandler;
    this._networkId = networkId;
    this._parallelize = parallelize;
    this._eventSession = eventSession;
    this._eventTxExecutor = eventTxExecutor;

    this._blockConfirmation = +this._eventSession.get(
      ClsNamespaces.BLOCK_CONFIRMATION_NUMBER
    );
  }

  public async execute(
    moduleName: string,
    moduleState: ModuleState,
    moduleConfig: ModuleConfig | undefined
  ): Promise<void> {
    // store everything before execution is started
    await this._moduleStateRepo.storeNewState(moduleName, moduleState);

    if (this._parallelize) {
      this._logger.startModuleDeploy(moduleName, moduleState);
      this._logger.parallelizationExperimental();
      if (!checkIfExist(moduleState)) {
        this._logger.nothingToDeploy();
      }

      await this._executeParallel(moduleName, moduleState, moduleConfig);

      return;
    }

    this._logger.startModuleDeploy(moduleName, moduleState);
    if (!checkIfExist(moduleState)) {
      this._logger.nothingToDeploy();
    }

    await this._executeSync(moduleName, moduleState, moduleConfig);
    return;
  }

  public async executeModuleEvents(
    moduleName: string,
    moduleState: ModuleState,
    moduleEvents: { [name: string]: ModuleEvent }
  ): Promise<void> {
    ModuleResolver.handleModuleEvents(moduleState, moduleEvents);

    for (const eventName of Object.keys(moduleEvents)) {
      await this._executeEvent(
        moduleName,
        moduleState[eventName] as StatefulEvent,
        moduleState
      );
    }
  }

  private async _executeSync(
    moduleName: string,
    moduleState: ModuleState,
    moduleConfig: ModuleConfig | undefined
  ): Promise<void> {
    for (let [elementName, element] of Object.entries(moduleState)) {
      if (checkIfExist((element as ContractBinding)?.bytecode)) {
        element = element as ContractBinding;

        // check if already deployed
        if (checkIfExist(element.deployMetaData?.contractAddress)) {
          this._logger.alreadyDeployed(elementName);
          await this._logger.promptContinueDeployment();
          this._logger.finishedBindingExecution(elementName);
          continue;
        }

        // in case if it is specified in module config for contract not to be deployed
        if (
          moduleConfig !== undefined &&
          moduleConfig.contract !== undefined &&
          checkIfExist(moduleConfig.contract[element.name]) &&
          !moduleConfig.contract[element.name].deploy
        ) {
          continue;
        }

        // @TODO(filip): this part is potentially unneeded, its already present in module resolver
        // // executing user defined shouldRedeploy function and skipping execution if user desired that.
        // if (
        //   element.deployMetaData.shouldRedeploy !== undefined &&
        //   !element.deployMetaData.shouldRedeploy(element)
        // ) {
        //   // @TODO
        //   throw new CliError("");
        // }

        this._logger.bindingExecution(element.name);
        element = await this._executeSingleBinding(
          moduleName,
          element as ContractBinding,
          moduleState
        );
        if (element?.txData?.output?.contractAddress !== undefined) {
          element.deployMetaData.contractAddress =
            element?.txData?.output?.contractAddress;
        }
        if (!checkIfExist(element.deployMetaData?.lastEventName)) {
          element.deployMetaData.logicallyDeployed = true;
        }

        await this._moduleStateRepo.storeSingleBinding(element);
        this._logger.finishedBindingExecution(element.name);
        continue;
      }

      this._logger.eventExecution((element as StatefulEvent).event.name);
      await this._executeEvent(
        moduleName,
        element as StatefulEvent,
        moduleState
      );
    }
  }

  private async _executeParallel(
    moduleName: string,
    moduleState: ModuleState,
    moduleConfig: ModuleConfig | undefined
  ): Promise<void> {
    const batches: [] = [];

    const elementsBatches: { [elementName: string]: number } = {};

    // batched libraries in first batch, if they exist
    let hasLibraries = false;
    for (let [, element] of Object.entries(moduleState)) {
      if (checkIfExist((element as ContractBinding)?.bytecode)) {
        element = element as ContractBinding;
        if (element.library) {
          await this._handleElement(
            0,
            batches,
            element,
            moduleState,
            elementsBatches
          );
          hasLibraries = true;
        }
      }
    }

    // batching elements depending on dependant tree depth.
    for (const [, element] of Object.entries(moduleState)) {
      if (hasLibraries) {
        await this._handleElement(
          1,
          batches,
          element,
          moduleState,
          elementsBatches
        );
        continue;
      }

      await this._handleElement(
        0,
        batches,
        element,
        moduleState,
        elementsBatches
      );
    }

    // batched execution
    await this._executeBatches(moduleName, batches, moduleState, moduleConfig);
  }

  private async _executeBatches(
    moduleName: string,
    batches: any[],
    moduleState: ModuleState,
    moduleConfig?: ModuleConfig
  ) {
    for (const batch of batches) {
      const promiseTxReceipt = [];
      for (let batchElement of batch) {
        if (!checkIfExist((batchElement as ContractBinding)?.bytecode)) {
          continue;
        }

        batchElement = batchElement as ContractBinding;
        if (checkIfExist(batchElement.deployMetaData?.contractAddress)) {
          this._logger.alreadyDeployed(batchElement.name);
          this._logger.finishedBindingExecution(batchElement.name);
          continue;
        }

        if (
          moduleConfig !== undefined &&
          moduleConfig.contract[batchElement.name] !== undefined &&
          checkIfExist(moduleConfig.contract[batchElement.name]) &&
          !moduleConfig.contract[batchElement.name].deploy
        ) {
          continue;
        }

        // @TODO(filip): this part is potentially unneeded
        // if (
        //   batchElement.deployMetaData.shouldRedeploy &&
        //   !batchElement.deployMetaData.shouldRedeploy(batchElement)
        // ) {
        //   continue;
        // }

        this._logger.bindingExecution(batchElement.name);
        batchElement = await this._executeSingleBinding(
          moduleName,
          batchElement,
          moduleState,
          true
        );
        promiseTxReceipt.push(
          batchElement.txData.input.wait(this._blockConfirmation)
        );
      }

      const txReceipt: { [txHash: string]: TransactionReceipt } = {};
      (await Promise.all(promiseTxReceipt)).forEach(
        (v: TransactionReceipt | any) => {
          if (v && v.transactionHash) {
            txReceipt[v.transactionHash] = v;
          }
        }
      );

      await this._executeEvents(moduleName, moduleState, batch);

      for (const batchElement of batch) {
        if (checkIfExist((batchElement as ContractBinding)?.bytecode)) {
          const txHash = batchElement.txData.input.hash;
          if (!checkIfExist(txReceipt[txHash])) {
            continue;
          }

          batchElement.txData.output = txReceipt[txHash];

          batchElement.deployMetaData.contractAddress =
            batchElement.txData.output.contractAddress;
          if (!checkIfExist(batchElement.deployMetaData?.lastEventName)) {
            batchElement.deployMetaData.logicallyDeployed = true;
          }

          moduleState[batchElement.name] = batchElement;

          await this._moduleStateRepo.storeSingleBinding(batchElement);
          this._logger.finishedBindingExecution(batchElement.name);
        }
      }
    }
  }

  private async _executeEvents(
    moduleName: string,
    moduleState: ModuleState,
    batch: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this._eventSession.run(async () => {
          this._eventSession.set(ClsNamespaces.PARALLELIZE, true);

          const eventPromise = [];
          for (const batchElement of batch) {
            if (checkIfExist((batchElement as ContractBinding)?.bytecode)) {
              continue;
            }

            this._logger.eventExecution(
              (batchElement as StatefulEvent).event.name
            );
            eventPromise.push(
              this._executeEvent(
                moduleName,
                batchElement as StatefulEvent,
                moduleState
              )
            );
          }

          await Promise.all(eventPromise);
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  private async _handleElement(
    currentBatch: number,
    batches: any[],
    element: ContractBinding | StatefulEvent,
    moduleState: ModuleState,
    elementsBatches: { [name: string]: number }
  ) {
    if (checkIfExist((element as ContractBinding)?.bytecode)) {
      element = element as ContractBinding;
      if (checkIfExist(elementsBatches[element.name])) {
        return;
      }

      for (const arg of element.args) {
        if (!checkIfExist(arg?.bytecode)) {
          continue;
        }

        const argBinding = moduleState[arg.name];
        if (!checkIfExist(argBinding)) {
          throw new NoContractBindingDataInModuleState(element.name, arg.name);
        }

        if (checkIfExist(elementsBatches[arg.name])) {
          currentBatch =
            currentBatch < elementsBatches[arg.name] + 1
              ? elementsBatches[arg.name] + 1
              : currentBatch;
          continue;
        }

        await this._handleElement(
          currentBatch,
          batches,
          argBinding,
          moduleState,
          elementsBatches
        );
        currentBatch = elementsBatches[element.name] + 1;
      }

      if (!checkIfExist(batches[currentBatch])) {
        batches[currentBatch] = [];
      }
      batches[currentBatch].push(element);

      elementsBatches[element.name] = currentBatch;

      return;
    }

    element = element as StatefulEvent;
    const event = element.event;

    if (checkIfExist(event.eventType)) {
      await TxExecutor._handleEvent(
        event,
        element,
        currentBatch,
        batches,
        moduleState,
        elementsBatches
      );
    }
  }

  private async _executeEvent(
    moduleName: string,
    event: StatefulEvent,
    moduleState: ModuleState
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this._eventSession.run(async () => {
        try {
          this._eventSession.set(ClsNamespaces.EVENT_NAME, event.event.name);

          switch (event.event.eventType) {
            case EventType.BEFORE_DEPLOY_EVENT: {
              await this._eventHandler.executeBeforeDeployEventHook(
                moduleName,
                event.event as BeforeDeployEvent,
                moduleState
              );
              break;
            }
            case EventType.AFTER_DEPLOY_EVENT: {
              await this._eventHandler.executeAfterDeployEventHook(
                moduleName,
                event.event as AfterDeployEvent,
                moduleState
              );
              break;
            }
            case EventType.BEFORE_COMPILE_EVENT: {
              await this._eventHandler.executeBeforeCompileEventHook(
                moduleName,
                event.event as BeforeCompileEvent,
                moduleState
              );
              break;
            }
            case EventType.AFTER_COMPILE_EVENT: {
              await this._eventHandler.executeAfterCompileEventHook(
                moduleName,
                event.event as AfterCompileEvent,
                moduleState
              );
              break;
            }
            case EventType.ON_CHANGE_EVENT: {
              await this._eventHandler.executeOnChangeEventHook(
                moduleName,
                event.event as OnChangeEvent,
                moduleState
              );
              break;
            }
            case EventType.ON_START: {
              await this._eventHandler.executeOnStartModuleEventHook(
                moduleName,
                event.event as ModuleEvent,
                moduleState
              );
              break;
            }
            case EventType.ON_COMPLETION: {
              await this._eventHandler.executeOnCompletionModuleEventHook(
                moduleName,
                event.event as ModuleEvent,
                moduleState
              );
              break;
            }
            case EventType.ON_SUCCESS: {
              await this._eventHandler.executeOnSuccessModuleEventHook(
                moduleName,
                event.event as ModuleEvent,
                moduleState
              );
              break;
            }
            case EventType.ON_FAIL: {
              await this._eventHandler.executeOnFailModuleEventHook(
                moduleName,
                event.event as ModuleEvent,
                moduleState
              );
              break;
            }
            default: {
              reject(
                new CliError(
                  `Failed to match event type with user event hooks - ${event.event.eventType}`
                )
              );
            }
          }

          if (checkIfExist((event.event as ContractEvent)?.deps)) {
            const deps = (event.event as ContractEvent).deps;
            for (const depName of deps) {
              await this._moduleStateRepo.storeSingleBinding(
                moduleState[depName] as ContractBinding
              );
            }
          }

          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  private async _executeSingleBinding(
    moduleName: string,
    binding: ContractBinding,
    moduleState: ModuleState,
    parallelized: boolean = false
  ): Promise<ContractBinding> {
    let constructorFragmentInputs = [] as JsonFragmentType[];

    if (!checkIfExist(binding?.abi)) {
      throw new MissingAbiInContractError(binding.name, binding.contractName);
    }

    binding.abi = binding.abi as JsonFragment[];
    for (const abi of binding.abi) {
      if (abi.type === CONSTRUCTOR_TYPE && abi.inputs !== undefined) {
        constructorFragmentInputs = abi.inputs;
        break;
      }
    }
    if (binding?.deployMetaData?.deploymentSpec?.deployFn !== undefined) {
      return this._eventSession.runAndReturn(
        async (): Promise<ContractBinding> => {
          if (binding?.deployMetaData?.deploymentSpec?.deployFn !== undefined) {
            this._eventSession.set(
              ClsNamespaces.EVENT_NAME,
              `Deploy${binding.name}`
            );
            this._moduleStateRepo.setSingleEventName(`Deploy${binding.name}`);
            const resp = await binding?.deployMetaData?.deploymentSpec?.deployFn();
            await this._moduleStateRepo.finishCurrentEvent(
              moduleName,
              moduleState,
              `Deploy${binding.name}`
            );

            binding.deployMetaData.contractAddress = resp.contractAddress;
            if (!checkIfExist(binding.deployMetaData?.lastEventName)) {
              binding.deployMetaData.logicallyDeployed = true;
            }

            moduleState[binding.name] = binding;
          }

          return binding;
        }
      );
    }

    let bytecode: string = binding.bytecode as string;
    const values: any[] = [];
    const types: any[] = [];

    // constructor params validation
    for (let i = 0; i < constructorFragmentInputs?.length; i++) {
      switch (typeof binding.args[i]) {
        case "object": {
          if (binding.args[i]?._isBigNumber) {
            const value = binding.args[i].toString();

            values.push(value);
            types.push(constructorFragmentInputs[i].type);
            break;
          }

          if (binding.args[i]?.type === "BigNumber") {
            const value = BigNumber.from(binding.args[i].hex).toString();

            values.push(value);
            types.push(constructorFragmentInputs[i].type);
            break;
          }

          if (binding.args[i].length >= 0) {
            values.push(binding.args[i]);
            types.push(constructorFragmentInputs[i].type);
            break;
          }

          if (
            `contract ${binding.args[i].name}` !==
              constructorFragmentInputs[i].internalType &&
            "address" !== constructorFragmentInputs[i].type
          ) {
            throw new ContractTypeMismatch(
              `Unsupported type for - ${binding.name} \n provided: ${
                binding.args[i].name
              } \n expected: ${constructorFragmentInputs[i].internalType ?? ""}`
            );
          }

          const dependencyName = binding.args[i].name;
          binding.args[i] = dependencyName;
          const dependencyTxData = moduleState[dependencyName]
            .txData as TransactionData;
          const dependencyDeployData = (moduleState[
            dependencyName
          ] as ContractBinding).deployMetaData as Deployed;
          if (
            !checkIfExist(dependencyTxData) ||
            !checkIfExist(dependencyTxData.input)
          ) {
            throw new ContractTypeMismatch(
              `Dependency contract not deployed \n Binding name: ${binding.name} \n Dependency name: ${binding.args[i]}`
            );
          }

          if (!checkIfExist(dependencyDeployData.contractAddress)) {
            throw new ContractTypeMismatch(
              `No contract address in dependency tree \n Binding name: ${binding.name} \n Dependency name: ${binding.args[i]}`
            );
          }

          values.push(dependencyDeployData.contractAddress);
          types.push(constructorFragmentInputs[i].type);

          break;
        }
        case "number": {
          values.push(binding.args[i]);
          types.push(constructorFragmentInputs[i].type);

          break;
        }
        case "string": {
          if (constructorFragmentInputs[i].type === "bytes") {
            values.push(Buffer.from(binding.args[i]));
            types.push(constructorFragmentInputs[i].type);
            break;
          }

          values.push(binding.args[i]);
          types.push(constructorFragmentInputs[i].type);

          break;
        }
        case "boolean": {
          values.push(binding.args[i]);
          types.push(constructorFragmentInputs[i].type);

          break;
        }
        default: {
          throw new ContractTypeUnsupported(
            `Unsupported type for - ${binding.name}  ${binding.args[i]}`
          );
        }
      }
    }

    bytecode = bytecode + abiCoder.encode(types, values).substring(2);
    bytecode = this._txGenerator.addLibraryAddresses(
      bytecode,
      binding.libraries,
      moduleState
    );

    const signedTx = await this._txGenerator.generateSingedTx(
      0,
      bytecode,
      binding.signer
    );

    this._logger.promptSignedTransaction(signedTx);
    await this._logger.promptExecuteTx();

    binding.txData = binding.txData as TransactionData;
    if (!parallelized) {
      binding.txData.output = await this._sendTransactionAndWait(
        binding.name,
        binding,
        signedTx
      );
    } else {
      binding.txData.input = await this._sendTransaction(
        binding.name,
        binding,
        signedTx
      );
    }

    return binding;
  }

  private async _sendTransaction(
    elementName: string,
    binding: ContractBinding,
    signedTx: string
  ): Promise<TransactionResponse> {
    return new Promise(async (resolve, reject) => {
      binding.txData = binding.txData as TransactionData;

      this._logger.sendingTx(elementName);
      let txResp;
      try {
        txResp = await this._ethers.sendTransaction(signedTx);
        resolve(txResp);
      } catch (e) {
        reject(new TransactionFailed(e.error.message));
      }
      this._logger.sentTx(elementName);
    });
  }

  private async _sendTransactionAndWait(
    elementName: string,
    binding: ContractBinding,
    signedTx: string
  ): Promise<TransactionReceipt> {
    return new Promise(async (resolve, reject) => {
      try {
        binding.txData = binding.txData as TransactionData;
        const txResp: TransactionResponse = await this._sendTransaction(
          elementName,
          binding,
          signedTx
        );

        binding.txData.input = txResp;
        await this._moduleStateRepo.storeSingleBinding(binding);

        this._logger.waitTransactionConfirmation();
        this._logger.transactionConfirmation(1, elementName);
        let txReceipt = await txResp.wait(1);
        binding.txData.output = txReceipt;
        await this._moduleStateRepo.storeSingleBinding(binding);

        let currentConfirmation = 2;
        while (currentConfirmation < this._blockConfirmation) {
          this._logger.transactionConfirmation(
            currentConfirmation,
            elementName
          );
          await txResp.wait(currentConfirmation);
          currentConfirmation++;
        }

        txReceipt = await txResp.wait(this._blockConfirmation);
        binding.txData.output = txReceipt;
        await this._moduleStateRepo.storeSingleBinding(binding);
        this._logger.transactionConfirmation(
          this._blockConfirmation,
          elementName
        );

        resolve(txReceipt);
      } catch (e) {
        reject(e);
      }
    });
  }
}
