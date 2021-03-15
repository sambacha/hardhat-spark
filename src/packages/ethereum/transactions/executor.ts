import {
  AfterCompileEvent,
  AfterDeployEvent,
  AfterDeploymentEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  BeforeDeploymentEvent,
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
} from '../../../interfaces/ignition';
import { IPrompter } from '../../utils/promter';
import { ModuleStateRepo } from '../../modules/states/state_repo';
import { checkIfExist } from '../../utils/util';
import { EthTxGenerator } from './generator';
import { BigNumber, providers } from 'ethers';
import { defaultAbiCoder as abiCoder } from '@ethersproject/abi';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';
import { JsonFragment, JsonFragmentType } from '../../types/artifacts/abi';
import { EventHandler } from '../../modules/events/handler';
import { CliError, ContractTypeMismatch, ContractTypeUnsupported, UserError } from '../../types/errors';
import { ModuleState } from '../../modules/states/module';
import { IModuleRegistryResolver } from '../../modules/states/registry';
import { ModuleResolver } from '../../modules/module_resolver';
import { Batcher } from '../../modules/events/batcher';
import { Namespace } from 'cls-hooked';
import { EventTxExecutor } from './event_executor';
import { clsNamespaces } from '../../utils/continuation_local_storage';

const CONSTRUCTOR_TYPE = 'constructor';
export const BLOCK_CONFIRMATION_NUMBER = 1;

export class TxExecutor {
  private readonly networkId: number;
  private readonly parallelize: boolean;

  private prompter: IPrompter;
  private moduleState: ModuleStateRepo;
  private txGenerator: EthTxGenerator;
  private ethers: providers.JsonRpcProvider;
  private eventHandler: EventHandler;
  private eventSession: Namespace;
  private eventTxExecutor: EventTxExecutor;

  constructor(prompter: IPrompter, moduleState: ModuleStateRepo, txGenerator: EthTxGenerator, networkId: number, ethers: providers.JsonRpcProvider, eventHandler: EventHandler, eventSession: Namespace, eventTxExecutor: EventTxExecutor, parallelize: boolean = false) {
    this.prompter = prompter;
    this.moduleState = moduleState;
    this.txGenerator = txGenerator;

    this.ethers = ethers;
    this.eventHandler = eventHandler;
    this.networkId = networkId;
    this.parallelize = parallelize;
    this.eventSession = eventSession;
    this.eventTxExecutor = eventTxExecutor;
  }

  async execute(moduleName: string, moduleState: ModuleState, registry: IModuleRegistryResolver | undefined, resolver: IModuleRegistryResolver | undefined, moduleConfig: ModuleConfig | undefined): Promise<void> {
    // store everything before execution is started
    await this.moduleState.storeNewState(moduleName, moduleState);

    if (this.parallelize) {
      await this.prompter.parallelizationExperimental();
      await this.prompter.startModuleDeploy(moduleName, moduleState);
      if (!checkIfExist(moduleState)) {
        this.prompter.nothingToDeploy();
      }

      await this.executeParallel(moduleName, moduleState, registry, resolver, moduleConfig);

      return;
    }

    await this.prompter.startModuleDeploy(moduleName, moduleState);
    if (!checkIfExist(moduleState)) {
      this.prompter.nothingToDeploy();
    }
    await this.executeSync(moduleName, moduleState, registry, resolver, moduleConfig);
    return;
  }

  private async executeSync(moduleName: string, moduleState: ModuleState, registry: IModuleRegistryResolver | undefined, resolver: IModuleRegistryResolver | undefined, moduleConfig: ModuleConfig | undefined): Promise<void> {
    for (let [elementName, element] of Object.entries(moduleState)) {
      if (checkIfExist((element as ContractBinding)?.bytecode)) {
        const contractAddress = await resolver?.resolveContract(this.networkId, moduleName, elementName);

        // check if already deployed
        element = element as ContractBinding;
        if (checkIfExist(element.deployMetaData?.contractAddress)) {
          this.prompter.alreadyDeployed(elementName);
          await this.prompter.promptContinueDeployment();
          continue;
        }

        // if contract is present in registry it would be resolved thought resolver
        if (checkIfExist(contractAddress)) {
          element.deployMetaData.contractAddress = contractAddress as string;
          this.prompter.alreadyDeployed(elementName);
          await this.moduleState.storeSingleBinding(element as ContractBinding);
          continue;
        }

        // in case if it is specified in module config for contract not to be deployed
        if (moduleConfig && checkIfExist(moduleConfig[element.name]) && !moduleConfig[element.name].deploy) {
          continue;
        }

        // executing user defined shouldRedeploy function and skipping execution if user desired that.
        if (
          element.deployMetaData.shouldRedeploy &&
          !element.deployMetaData.shouldRedeploy(element)) {
          continue;
        }

        this.prompter.bindingExecution(element.name);
        element = await this.executeSingleBinding(moduleName, element as ContractBinding, moduleState);
        element.deployMetaData.contractAddress = element.txData.output.contractAddress;
        if (!checkIfExist(element.deployMetaData?.lastEventName)) {
          element.deployMetaData.logicallyDeployed = true;
        }

        if (checkIfExist(registry) && checkIfExist(element?.deployMetaData?.contractAddress)) {
          await registry?.setAddress(this.networkId, moduleName, element.name, element?.deployMetaData?.contractAddress as string);
        }

        await this.moduleState.storeSingleBinding(element);
        this.prompter.finishedBindingExecution(element.name);
        continue;
      }

      this.prompter.eventExecution((element as StatefulEvent).event.name);
      await this.executeEvent(moduleName, element as StatefulEvent, moduleState);
    }
  }

  private async executeParallel(moduleName: string, moduleState: ModuleState, registry: IModuleRegistryResolver | undefined, resolver: IModuleRegistryResolver | undefined, moduleConfig: ModuleConfig | undefined): Promise<void> {
    const batches = [];

    const elementsBatches: { [elementName: string]: number } = {};

    // batched libraries in first batch, if they exist
    let hasLibraries = false;
    for (let [, element] of Object.entries(moduleState)) {
      if (checkIfExist((element as ContractBinding)?.bytecode)) {
        element = element as ContractBinding;
        if (element.library) {
          await this.handleElement(0, batches, element, moduleState, elementsBatches);
          hasLibraries = true;
        }
      }
    }

    // batching elements depending on dependant tree depth.
    for (const [, element] of Object.entries(moduleState)) {
      if (hasLibraries) {
        await this.handleElement(1, batches, element, moduleState, elementsBatches);
        continue;
      }

      await this.handleElement(0, batches, element, moduleState, elementsBatches);
    }

    // batched execution
    await this.executeBatches(moduleName, batches, moduleState, registry, resolver, moduleConfig);
  }

  private async executeBatches(moduleName: string, batches: any[], moduleState: ModuleState, registry: IModuleRegistryResolver | undefined, resolver: IModuleRegistryResolver | undefined, moduleConfig: ModuleConfig | undefined) {
    for (const batch of batches) {
      const promiseTxReceipt = [];
      for (let batchElement of batch) {
        if (!checkIfExist((batchElement as ContractBinding)?.bytecode)) {
          continue;
        }

        const contractAddress = await resolver?.resolveContract(this.networkId, moduleName, batchElement.name);

        batchElement = batchElement as ContractBinding;
        if (checkIfExist(batchElement.deployMetaData?.contractAddress)) {
          await this.prompter.alreadyDeployed(batchElement.name);
          continue;
        }

        if (checkIfExist(contractAddress)) {
          batchElement.deployMetaData.contractAddress = contractAddress as string;
          await this.moduleState.storeSingleBinding(batchElement as ContractBinding);
          continue;
        }

        if (moduleConfig && checkIfExist(moduleConfig[batchElement.name]) && !moduleConfig[batchElement.name].deploy) {
          continue;
        }

        if (
          batchElement.deployMetaData.shouldRedeploy &&
          !batchElement.deployMetaData.shouldRedeploy(batchElement)) {
          continue;
        }

        this.prompter.bindingExecution(batchElement.name);
        batchElement = await this.executeSingleBinding(moduleName, batchElement, moduleState, true);
        promiseTxReceipt.push(batchElement.txData.input.wait(BLOCK_CONFIRMATION_NUMBER));
      }

      const txReceipt = {};
      (await Promise.all(promiseTxReceipt)).forEach((v: TransactionReceipt | any) => {
        if (v && v.transactionHash) {
          txReceipt[v.transactionHash] = v;
        }
      });

      await this.executeEvents(moduleName, moduleState, batch, batch.length - promiseTxReceipt.length);

      for (const batchElement of batch) {
        if (checkIfExist((batchElement as ContractBinding)?.bytecode)) {
          const txHash = batchElement.txData.input.hash;
          if (!checkIfExist(txReceipt[txHash])) {
            continue;
          }

          batchElement.txData.output = txReceipt[txHash];

          batchElement.deployMetaData.contractAddress = batchElement.txData.output.contractAddress;
          if (!checkIfExist(batchElement.deployMetaData?.lastEventName)) {
            batchElement.deployMetaData.logicallyDeployed = true;
          }

          moduleState[batchElement.name] = batchElement;

          if (checkIfExist(registry) && checkIfExist(batchElement?.deployMetaData?.contractAddress)) {
            await registry?.setAddress(this.networkId, moduleName, batchElement.name, batchElement?.deployMetaData?.contractAddress as string);
          }

          await this.moduleState.storeSingleBinding(batchElement);
          this.prompter.finishedBindingExecution(batchElement.name);
        }
      }
    }
  }

  private async executeEvents(moduleName: string, moduleState: ModuleState, batch: any, numberOfEvents: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSession.run(async () => {
          this.eventSession.set(clsNamespaces.PARALLELIZE, true);

          const eventPromise = [];
          for (let i = 0; i < batch.length; i++) {
            const batchElement = batch[i];
            if (checkIfExist((batchElement as ContractBinding)?.bytecode)) {
              continue;
            }

            this.prompter.eventExecution((batchElement as StatefulEvent).event.name);
            eventPromise.push(this.executeEvent(moduleName, batchElement as StatefulEvent, moduleState));
          }

          await Promise.all(eventPromise);
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  private async handleElement(currentBatch: number, batches: any[], element: ContractBinding | StatefulEvent, moduleState: ModuleState, elementsBatches: any) {
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
          throw new CliError(`Their is no data of this minding in resolved module state - ${arg.name}`);
        }

        if (checkIfExist(elementsBatches[arg.name])) {
          currentBatch = currentBatch < elementsBatches[arg.name] + 1 ? elementsBatches[arg.name] + 1 : currentBatch;
          continue;
        }

        await this.handleElement(currentBatch, batches, argBinding, moduleState, elementsBatches);
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
      await TxExecutor.handleEvent(event, element, currentBatch, batches, moduleState, elementsBatches);
    }
  }

  private static async handleEvent(event: Event, element: StatefulEvent, currentBatch: number, batches: any[], moduleState: ModuleState, elementsBatches: any) {
    switch (event.eventType) {
      case EventType.AfterDeployEvent:
      case EventType.AfterDeploymentEvent: {
        await Batcher.handleAfterDeployEvent(event as AfterDeployEvent, element, batches, elementsBatches);
        break;
      }
      case EventType.OnChangeEvent: {
        await Batcher.handleOnChangeEvent(event as OnChangeEvent, element, batches, elementsBatches);
        break;
      }
      case EventType.BeforeCompileEvent: {
        await Batcher.handleBeforeCompileEvent(event as BeforeCompileEvent, element, batches, elementsBatches);
        break;
      }
      case EventType.BeforeDeployEvent:
      case EventType.BeforeDeploymentEvent:
      case EventType.AfterCompileEvent: {
        await Batcher.handleCompiledEvent(event as BeforeDeployEvent, element, batches, elementsBatches);
        break;
      }
      case EventType.OnStart: {
        await Batcher.handleOnModuleStart(event as ModuleEvent, element, batches);
        break;
      }
      default: {
        throw new CliError(`Failed to match event type with user event hooks - ${event.eventType}`);
      }
    }
  }

  async executeModuleEvents(moduleName: string, moduleState: ModuleState, moduleEvents: { [name: string]: ModuleEvent }): Promise<void> {
    ModuleResolver.handleModuleEvents(moduleState, moduleEvents);

    for (const [eventName] of Object.entries(moduleEvents)) {
      await this.executeEvent(moduleName, moduleState[eventName] as StatefulEvent, moduleState);
    }
  }

  private async executeEvent(moduleName: string, event: StatefulEvent, moduleState: ModuleState): Promise<void> {
    return new Promise(((resolve, reject) => {
      this.eventSession.run(async () => {
        try {
          this.eventSession.set(clsNamespaces.EVENT_NAME, event.event.name);

          switch (event.event.eventType) {
            case EventType.BeforeDeployEvent: {
              await this.eventHandler.executeBeforeDeployEventHook(moduleName, event.event as BeforeDeployEvent, moduleState);
              break;
            }
            case EventType.AfterDeployEvent: {
              await this.eventHandler.executeAfterDeployEventHook(moduleName, event.event as AfterDeployEvent, moduleState);
              break;
            }
            case EventType.AfterDeploymentEvent: {
              await this.eventHandler.executeAfterDeploymentEventHook(moduleName, event.event as AfterDeploymentEvent, moduleState);
              break;
            }
            case EventType.BeforeDeploymentEvent: {
              await this.eventHandler.executeBeforeDeploymentEventHook(moduleName, event.event as BeforeDeploymentEvent, moduleState);
              break;
            }
            case EventType.BeforeCompileEvent: {
              await this.eventHandler.executeBeforeCompileEventHook(moduleName, event.event as BeforeCompileEvent, moduleState);
              break;
            }
            case EventType.AfterCompileEvent: {
              await this.eventHandler.executeAfterCompileEventHook(moduleName, event.event as AfterCompileEvent, moduleState);
              break;
            }
            case EventType.OnChangeEvent: {
              await this.eventHandler.executeOnChangeEventHook(moduleName, event.event as OnChangeEvent, moduleState);
              break;
            }
            case EventType.OnStart: {
              await this.eventHandler.executeOnStartModuleEventHook(moduleName, event.event as ModuleEvent, moduleState);
              break;
            }
            case EventType.OnCompletion: {
              await this.eventHandler.executeOnCompletionModuleEventHook(moduleName, event.event as ModuleEvent, moduleState);
              break;
            }
            case EventType.OnSuccess: {
              await this.eventHandler.executeOnSuccessModuleEventHook(moduleName, event.event as ModuleEvent, moduleState);
              break;
            }
            case EventType.OnFail: {
              await this.eventHandler.executeOnFailModuleEventHook(moduleName, event.event as ModuleEvent, moduleState);
              break;
            }
            default: {
              reject(new CliError(`Failed to match event type with user event hooks - ${event.event.eventType}`));
            }
          }

          if (checkIfExist((event.event as ContractEvent)?.deps)) {
            const deps = (event.event as ContractEvent).deps;
            for (const depName of deps) {
              await this.moduleState.storeSingleBinding(moduleState[depName] as ContractBinding);
            }
          }

          resolve();
        } catch (e) {
          reject(e);
        }
      });
    }));
  }

  private async executeSingleBinding(moduleName: string, binding: ContractBinding, moduleState: ModuleState, parallelized: boolean = false): Promise<ContractBinding> {
    let constructorFragmentInputs = [] as JsonFragmentType[];

    if (!checkIfExist(binding?.abi)) {
      throw new UserError(`Missing abi from binding - ${binding.name}`);
    }

    binding.abi = binding.abi as JsonFragment[];
    for (let i = 0; i < binding.abi.length; i++) {
      const abi = binding.abi[i];

      if (abi.type == CONSTRUCTOR_TYPE && abi.inputs) {
        constructorFragmentInputs = abi.inputs;
        break;
      }
    }

    if (binding.deployMetaData.deploymentSpec.deployFn) {
      // @TODO this doesn't work when running parallelized
      this.moduleState.setSingleEventName(`Deploy${binding.name}`);
      const resp = await binding.deployMetaData.deploymentSpec.deployFn();
      await this.moduleState.finishCurrentEvent(moduleName, moduleState, `Deploy${binding.name}`);

      binding.deployMetaData.contractAddress = resp.contractAddress;
      binding.txData.output = resp.transaction;
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
        case 'object': {
          if (binding.args[i]?._isBigNumber) {
            const value = binding.args[i].toString();

            values.push(value);
            types.push(constructorFragmentInputs[i].type);
            break;
          }

          if (binding.args[i]?.type == 'BigNumber') {
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
            'contract ' + binding.args[i].name != constructorFragmentInputs[i].internalType &&
            'address' != constructorFragmentInputs[i].type
          ) {
            throw new ContractTypeMismatch(`Unsupported type for - ${binding.name} \n provided: ${binding.args[i].name} \n expected: ${constructorFragmentInputs[i].internalType || ''}`);
          }

          const dependencyName = binding.args[i].name;
          binding.args[i] = dependencyName;
          const dependencyTxData = moduleState[dependencyName].txData as TransactionData;
          const dependencyDeployData = (moduleState[dependencyName] as ContractBinding).deployMetaData as Deployed;
          if (
            !checkIfExist(dependencyTxData) ||
            !checkIfExist(dependencyTxData.input)
          ) {
            throw new ContractTypeMismatch(`Dependency contract not deployed \n Binding name: ${binding.name} \n Dependency name: ${binding.args[i]}`);
          }

          if (!checkIfExist(dependencyDeployData.contractAddress)) {
            throw new ContractTypeMismatch(`No contract address in dependency tree \n Binding name: ${binding.name} \n Dependency name: ${binding.args[i]}`);
          }

          values.push(dependencyDeployData.contractAddress);
          types.push(constructorFragmentInputs[i].type);

          break;
        }
        case 'number': {
          values.push(binding.args[i]);
          types.push(constructorFragmentInputs[i].type);

          break;
        }
        case 'string': {
          if (constructorFragmentInputs[i].type == 'bytes') {
            values.push(Buffer.from(binding.args[i]));
            types.push(constructorFragmentInputs[i].type);
            break;
          }

          values.push(binding.args[i]);
          types.push(constructorFragmentInputs[i].type);

          break;
        }
        case 'boolean': {
          values.push(binding.args[i]);
          types.push(constructorFragmentInputs[i].type);


          break;
        }
        default: {
          throw new ContractTypeUnsupported(`Unsupported type for - ${binding.name}  ${binding.args[i]}`);
        }
      }
    }

    bytecode = bytecode + abiCoder.encode(types, values).substring(2);
    bytecode = await this.txGenerator.addLibraryAddresses(bytecode, binding, moduleState);

    const signedTx = await this.txGenerator.generateSingedTx(
      0,
      bytecode,
      binding.wallet,
    );

    await this.prompter.promptSignedTransaction(signedTx);
    await this.prompter.promptExecuteTx();

    binding.txData = binding.txData as TransactionData;
    if (!parallelized) {
      binding.txData.output = await this.sendTransactionAndWait(binding.name, binding, signedTx);
    } else {
      binding.txData.input = await this.sendTransaction(binding.name, binding, signedTx);
    }

    return binding;
  }

  private async sendTransaction(elementName: string, binding: ContractBinding, signedTx: string): Promise<TransactionResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        binding.txData = binding.txData as TransactionData;

        this.prompter.sendingTx(elementName);
        const txResp = await this.ethers.sendTransaction(signedTx);
        this.prompter.sentTx(elementName);

        resolve(txResp);
      } catch (e) {
        reject(e);
      }
    });
  }

  private async sendTransactionAndWait(elementName: string, binding: ContractBinding, signedTx: string): Promise<TransactionReceipt> {
    return new Promise(async (resolve, reject) => {
      try {
        binding.txData = binding.txData as TransactionData;

        this.prompter.sendingTx(elementName);
        const txResp = await this.ethers.sendTransaction(signedTx);
        this.prompter.sentTx(elementName);

        let txReceipt = await txResp.wait(1);
        binding.txData.output = txReceipt;
        await this.moduleState.storeSingleBinding(binding);

        this.prompter.waitTransactionConfirmation();
        txReceipt = await txResp.wait(BLOCK_CONFIRMATION_NUMBER);
        binding.txData.output = txReceipt;
        await this.moduleState.storeSingleBinding(binding);
        this.prompter.transactionConfirmation(BLOCK_CONFIRMATION_NUMBER, elementName);

        resolve(txReceipt);
      } catch (e) {
        reject(e);
      }
    });
  }
}
