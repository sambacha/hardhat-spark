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
} from "../../../interfaces/hardhat_ignition";
import { Batcher } from "../../modules/events/batcher";
import { EventHandler } from "../../modules/events/handler";
import { ModuleResolver } from "../../modules/module_resolver";
import { IModuleRegistryResolver } from "../../modules/states/registry";
import { ModuleStateRepo } from "../../modules/states/repo/state_repo";
import { JsonFragment, JsonFragmentType } from "../../types/artifacts/abi";
import {
  CliError,
  ContractTypeMismatch,
  ContractTypeUnsupported,
  MissingAbiInContractError,
  NoContractBindingDataInModuleState,
  TransactionFailed,
} from "../../types/errors";
import { ModuleState } from "../../types/module";
import { clsNamespaces } from "../../utils/continuation_local_storage";
import { ILogging } from "../../utils/logging";
import { checkIfExist } from "../../utils/util";

import { EventTxExecutor } from "./event_executor";
import { EthTxGenerator } from "./generator";

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
      case EventType.AfterDeployEvent: {
        await Batcher.handleAfterDeployEvent(
          event as AfterDeployEvent,
          element,
          batches,
          elementsBatches
        );
        break;
      }
      case EventType.OnChangeEvent: {
        await Batcher.handleOnChangeEvent(
          event as OnChangeEvent,
          element,
          batches,
          elementsBatches
        );
        break;
      }
      case EventType.BeforeCompileEvent: {
        await Batcher.handleBeforeCompileEvent(
          event as BeforeCompileEvent,
          element,
          batches,
          elementsBatches
        );
        break;
      }
      case EventType.BeforeDeployEvent:
      case EventType.AfterCompileEvent: {
        await Batcher.handleCompiledEvent(
          event as BeforeDeployEvent,
          element,
          batches,
          elementsBatches
        );
        break;
      }
      case EventType.OnStart:
      case EventType.OnCompletion:
      case EventType.OnFail:
      case EventType.OnSuccess: {
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
  private readonly networkId: string;
  private readonly parallelize: boolean;

  private prompter: ILogging;
  private moduleStateRepo: ModuleStateRepo;
  private txGenerator: EthTxGenerator;
  private ethers: providers.JsonRpcProvider;
  private eventHandler: EventHandler;
  private eventSession: Namespace;
  private eventTxExecutor: EventTxExecutor;
  private readonly blockConfirmation: number;

  constructor(
    prompter: ILogging,
    moduleState: ModuleStateRepo,
    txGenerator: EthTxGenerator,
    networkId: string,
    ethers: providers.JsonRpcProvider,
    eventHandler: EventHandler,
    eventSession: Namespace,
    eventTxExecutor: EventTxExecutor,
    parallelize: boolean = false
  ) {
    this.prompter = prompter;
    this.moduleStateRepo = moduleState;
    this.txGenerator = txGenerator;

    this.ethers = ethers;
    this.eventHandler = eventHandler;
    this.networkId = networkId;
    this.parallelize = parallelize;
    this.eventSession = eventSession;
    this.eventTxExecutor = eventTxExecutor;

    this.blockConfirmation = +(process.env.BLOCK_CONFIRMATION_NUMBER || 1);
  }

  public async execute(
    moduleName: string,
    moduleState: ModuleState,
    registry: IModuleRegistryResolver | undefined,
    resolver: IModuleRegistryResolver | undefined,
    moduleConfig: ModuleConfig | undefined
  ): Promise<void> {
    // store everything before execution is started
    await this.moduleStateRepo.storeNewState(moduleName, moduleState);

    if (this.parallelize) {
      await this.prompter.startModuleDeploy(moduleName, moduleState);
      await this.prompter.parallelizationExperimental();
      if (!checkIfExist(moduleState)) {
        this.prompter.nothingToDeploy();
      }

      await this._executeParallel(
        moduleName,
        moduleState,
        registry,
        resolver,
        moduleConfig
      );

      return;
    }

    await this.prompter.startModuleDeploy(moduleName, moduleState);
    if (!checkIfExist(moduleState)) {
      this.prompter.nothingToDeploy();
    }

    await this._executeSync(
      moduleName,
      moduleState,
      registry,
      resolver,
      moduleConfig
    );
    return;
  }

  public async executeModuleEvents(
    moduleName: string,
    moduleState: ModuleState,
    moduleEvents: { [name: string]: ModuleEvent }
  ): Promise<void> {
    ModuleResolver.handleModuleEvents(moduleState, moduleEvents);

    for (const [eventName, event] of Object.entries(moduleEvents)) {
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
    registry: IModuleRegistryResolver | undefined,
    resolver: IModuleRegistryResolver | undefined,
    moduleConfig: ModuleConfig | undefined
  ): Promise<void> {
    for (let [elementName, element] of Object.entries(moduleState)) {
      if (checkIfExist((element as ContractBinding)?.bytecode)) {
        element = element as ContractBinding;

        const contractAddress = await resolver?.resolveContract(
          this.networkId,
          moduleName,
          elementName
        );

        // check if already deployed
        if (checkIfExist(element.deployMetaData?.contractAddress)) {
          this.prompter.alreadyDeployed(elementName);
          await this.prompter.promptContinueDeployment();
          await this.prompter.finishedBindingExecution(elementName);
          continue;
        }

        // if contract is present in registry it would be resolved thought resolver
        if (checkIfExist(contractAddress)) {
          element.deployMetaData.contractAddress = contractAddress as string;
          this.prompter.alreadyDeployed(elementName);
          await this.moduleStateRepo.storeSingleBinding(
            element as ContractBinding
          );
          await this.prompter.finishedBindingExecution(elementName);
          continue;
        }

        // in case if it is specified in module config for contract not to be deployed
        if (
          moduleConfig &&
          moduleConfig.contract &&
          checkIfExist(moduleConfig.contract[element.name]) &&
          !moduleConfig.contract[element.name].deploy
        ) {
          continue;
        }

        // executing user defined shouldRedeploy function and skipping execution if user desired that.
        if (
          element.deployMetaData.shouldRedeploy &&
          !element.deployMetaData.shouldRedeploy(element)
        ) {
          continue;
        }

        this.prompter.bindingExecution(element.name);
        element = await this._executeSingleBinding(
          moduleName,
          element as ContractBinding,
          moduleState
        );
        element.deployMetaData.contractAddress =
          element?.txData?.output?.contractAddress;
        if (!checkIfExist(element.deployMetaData?.lastEventName)) {
          element.deployMetaData.logicallyDeployed = true;
        }

        if (
          checkIfExist(registry) &&
          checkIfExist(element?.deployMetaData?.contractAddress)
        ) {
          await registry?.setAddress(
            this.networkId,
            moduleName,
            element.name,
            element?.deployMetaData?.contractAddress as string
          );
        }

        await this.moduleStateRepo.storeSingleBinding(element);
        this.prompter.finishedBindingExecution(element.name);
        continue;
      }

      this.prompter.eventExecution((element as StatefulEvent).event.name);
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
    registry: IModuleRegistryResolver | undefined,
    resolver: IModuleRegistryResolver | undefined,
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
    await this._executeBatches(
      moduleName,
      batches,
      moduleState,
      registry,
      resolver,
      moduleConfig
    );
  }

  private async _executeBatches(
    moduleName: string,
    batches: any[],
    moduleState: ModuleState,
    registry?: IModuleRegistryResolver,
    resolver?: IModuleRegistryResolver,
    moduleConfig?: ModuleConfig
  ) {
    for (const batch of batches) {
      const promiseTxReceipt = [];
      for (let batchElement of batch) {
        if (!checkIfExist((batchElement as ContractBinding)?.bytecode)) {
          continue;
        }

        const contractAddress = await resolver?.resolveContract(
          this.networkId,
          moduleName,
          batchElement.name
        );

        batchElement = batchElement as ContractBinding;
        if (checkIfExist(batchElement.deployMetaData?.contractAddress)) {
          await this.prompter.alreadyDeployed(batchElement.name);
          await this.prompter.finishedBindingExecution(batchElement.name);
          continue;
        }

        if (checkIfExist(contractAddress)) {
          batchElement.deployMetaData.contractAddress = contractAddress as string;
          await this.moduleStateRepo.storeSingleBinding(
            batchElement as ContractBinding
          );
          continue;
        }

        if (
          moduleConfig &&
          moduleConfig.contract[batchElement.name] &&
          checkIfExist(moduleConfig.contract[batchElement.name]) &&
          !moduleConfig.contract[batchElement.name].deploy
        ) {
          continue;
        }

        if (
          batchElement.deployMetaData.shouldRedeploy &&
          !batchElement.deployMetaData.shouldRedeploy(batchElement)
        ) {
          continue;
        }

        this.prompter.bindingExecution(batchElement.name);
        batchElement = await this._executeSingleBinding(
          moduleName,
          batchElement,
          moduleState,
          true
        );
        promiseTxReceipt.push(
          batchElement.txData.input.wait(this.blockConfirmation)
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

      await this._executeEvents(
        moduleName,
        moduleState,
        batch,
        batch.length - promiseTxReceipt.length
      );

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

          if (
            checkIfExist(registry) &&
            checkIfExist(batchElement?.deployMetaData?.contractAddress)
          ) {
            await registry?.setAddress(
              this.networkId,
              moduleName,
              batchElement.name,
              batchElement?.deployMetaData?.contractAddress as string
            );
          }

          await this.moduleStateRepo.storeSingleBinding(batchElement);
          this.prompter.finishedBindingExecution(batchElement.name);
        }
      }
    }
  }

  private async _executeEvents(
    moduleName: string,
    moduleState: ModuleState,
    batch: any,
    numberOfEvents: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSession.run(async () => {
          this.eventSession.set(clsNamespaces.PARALLELIZE, true);

          const eventPromise = [];
          for (const batchElement of batch) {
            if (checkIfExist((batchElement as ContractBinding)?.bytecode)) {
              continue;
            }

            this.prompter.eventExecution(
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
    elementsBatches: any
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
      this.eventSession.run(async () => {
        try {
          this.eventSession.set(clsNamespaces.EVENT_NAME, event.event.name);

          switch (event.event.eventType) {
            case EventType.BeforeDeployEvent: {
              await this.eventHandler.executeBeforeDeployEventHook(
                moduleName,
                event.event as BeforeDeployEvent,
                moduleState
              );
              break;
            }
            case EventType.AfterDeployEvent: {
              await this.eventHandler.executeAfterDeployEventHook(
                moduleName,
                event.event as AfterDeployEvent,
                moduleState
              );
              break;
            }
            case EventType.BeforeCompileEvent: {
              await this.eventHandler.executeBeforeCompileEventHook(
                moduleName,
                event.event as BeforeCompileEvent,
                moduleState
              );
              break;
            }
            case EventType.AfterCompileEvent: {
              await this.eventHandler.executeAfterCompileEventHook(
                moduleName,
                event.event as AfterCompileEvent,
                moduleState
              );
              break;
            }
            case EventType.OnChangeEvent: {
              await this.eventHandler.executeOnChangeEventHook(
                moduleName,
                event.event as OnChangeEvent,
                moduleState
              );
              break;
            }
            case EventType.OnStart: {
              await this.eventHandler.executeOnStartModuleEventHook(
                moduleName,
                event.event as ModuleEvent,
                moduleState
              );
              break;
            }
            case EventType.OnCompletion: {
              await this.eventHandler.executeOnCompletionModuleEventHook(
                moduleName,
                event.event as ModuleEvent,
                moduleState
              );
              break;
            }
            case EventType.OnSuccess: {
              await this.eventHandler.executeOnSuccessModuleEventHook(
                moduleName,
                event.event as ModuleEvent,
                moduleState
              );
              break;
            }
            case EventType.OnFail: {
              await this.eventHandler.executeOnFailModuleEventHook(
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
              await this.moduleStateRepo.storeSingleBinding(
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
      if (abi.type === CONSTRUCTOR_TYPE && abi.inputs) {
        constructorFragmentInputs = abi.inputs;
        break;
      }
    }

    if (binding?.deployMetaData?.deploymentSpec?.deployFn) {
      // @TODO this doesn't work when running parallelized
      this.moduleStateRepo.setSingleEventName(`Deploy${binding.name}`);
      const resp = await binding.deployMetaData.deploymentSpec.deployFn();
      await this.moduleStateRepo.finishCurrentEvent(
        moduleName,
        moduleState,
        `Deploy${binding.name}`
      );

      binding.deployMetaData.contractAddress = resp.contractAddress;
      if (!binding.txData) {
        binding.txData = {
          input: {
            from: resp.transaction.from,
          },
          output: resp.transaction,
        };
      }
      if (!checkIfExist(binding.deployMetaData?.lastEventName)) {
        binding.deployMetaData.logicallyDeployed = true;
      }

      moduleState[binding.name] = binding;

      return binding;
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
              } \n expected: ${constructorFragmentInputs[i].internalType || ""}`
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
    bytecode = await this.txGenerator.addLibraryAddresses(
      bytecode,
      binding.libraries,
      moduleState
    );

    const signedTx = await this.txGenerator.generateSingedTx(
      0,
      bytecode,
      binding.signer
    );

    await this.prompter.promptSignedTransaction(signedTx);
    await this.prompter.promptExecuteTx();

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

      this.prompter.sendingTx(elementName);
      let txResp;
      try {
        txResp = await this.ethers.sendTransaction(signedTx);
        resolve(txResp);
      } catch (e) {
        reject(new TransactionFailed(e.error.message));
      }
      this.prompter.sentTx(elementName);
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
        await this.moduleStateRepo.storeSingleBinding(binding);

        this.prompter.waitTransactionConfirmation();
        this.prompter.transactionConfirmation(1, elementName);
        let txReceipt = await txResp.wait(1);
        binding.txData.output = txReceipt;
        await this.moduleStateRepo.storeSingleBinding(binding);

        let currentConfirmation = 2;
        while (currentConfirmation < this.blockConfirmation) {
          this.prompter.transactionConfirmation(
            currentConfirmation,
            elementName
          );
          await txResp.wait(currentConfirmation);
          currentConfirmation++;
        }

        txReceipt = await txResp.wait(this.blockConfirmation);
        binding.txData.output = txReceipt;
        await this.moduleStateRepo.storeSingleBinding(binding);
        this.prompter.transactionConfirmation(
          this.blockConfirmation,
          elementName
        );

        resolve(txReceipt);
      } catch (e) {
        reject(e);
      }
    });
  }
}
