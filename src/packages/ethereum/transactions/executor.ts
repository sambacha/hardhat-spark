import {
  AfterCompileEvent,
  AfterDeployEvent,
  AfterDeploymentEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  BeforeDeploymentEvent,
  ContractBinding,
  ContractEvent,
  Deployed, ModuleConfig,
  ModuleEvent,
  OnChangeEvent,
  StatefulEvent,
  TransactionData
} from '../../../interfaces/mortar';
import { Prompter } from '../../prompter';
import { ModuleStateRepo } from '../../modules/states/state_repo';
import { checkIfExist } from '../../utils/util';
import { EthTxGenerator } from './generator';
import { BigNumber, providers } from 'ethers';
import { defaultAbiCoder as abiCoder } from '@ethersproject/abi';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { JsonFragment, JsonFragmentType } from '../../types/artifacts/abi';
import { cli } from 'cli-ux';
import { EventHandler } from '../../modules/events/handler';
import { CliError, ContractTypeMismatch, ContractTypeUnsupported, UserError } from '../../types/errors';
import { ModuleState } from '../../modules/states/module';
import { IModuleRegistryResolver } from '../../modules/states/registry';
import { ModuleResolver } from '../../modules/module_resolver';

const CONSTRUCTOR_TYPE = 'constructor';
export const BLOCK_CONFIRMATION_NUMBER = 1;

export class TxExecutor {
  private readonly networkId: number;

  private prompter: Prompter;
  private moduleState: ModuleStateRepo;
  private txGenerator: EthTxGenerator;
  private ethers: providers.JsonRpcProvider;
  private eventHandler: EventHandler;

  constructor(prompter: Prompter, moduleState: ModuleStateRepo, txGenerator: EthTxGenerator, networkId: number, ethers: providers.JsonRpcProvider, eventHandler: EventHandler) {
    this.prompter = prompter;
    this.moduleState = moduleState;
    this.txGenerator = txGenerator;

    this.ethers = ethers;
    this.eventHandler = eventHandler;
    this.networkId = networkId;
  }

  async execute(moduleName: string, moduleState: ModuleState, registry: IModuleRegistryResolver | undefined, resolver: IModuleRegistryResolver | undefined, moduleConfig: ModuleConfig | undefined): Promise<void> {
    await this.moduleState.storeNewState(moduleName, moduleState);

    for (let [elementName, element] of Object.entries(moduleState)) {
      if (checkIfExist((element as ContractBinding)?.bytecode)) {
        const contractAddress = await resolver?.resolveContract(this.networkId, moduleName, elementName);

        element = element as ContractBinding;
        if (checkIfExist(element.deployMetaData?.contractAddress)) {
          cli.info(elementName, 'is already deployed');
          await this.prompter.promptContinueDeployment();
          continue;
        }

        if (checkIfExist(contractAddress)) {
          element.deployMetaData.contractAddress = contractAddress as string;
          await this.moduleState.storeSingleBinding(element as ContractBinding);
          continue;
        }

        if (moduleConfig && checkIfExist(moduleConfig[element.name]) && !moduleConfig[element.name].deploy) {
          continue;
        }

        if (
          element.deployMetaData.shouldRedeploy &&
          !element.deployMetaData.shouldRedeploy(element)) {
            continue;
        }

        element = await this.executeSingleBinding(element as ContractBinding, moduleState);
        if (checkIfExist(registry) && checkIfExist(element?.deployMetaData?.contractAddress)) {
          await registry?.setAddress(this.networkId, moduleName, element.name, element?.deployMetaData?.contractAddress as string);
        }

        await this.moduleState.storeSingleBinding(element);
        continue;
      }

      await this.executeEvent(moduleName, element as StatefulEvent, moduleState);
    }

    return;
  }

  async executeModuleEvents(moduleName: string, moduleState: ModuleState, moduleEvents: { [name: string]: ModuleEvent }): Promise<void> {
    ModuleResolver.handleModuleEvents(moduleState, moduleEvents);

    for (const [eventName] of Object.entries(moduleEvents)) {
      await this.executeEvent(moduleName, moduleState[eventName] as StatefulEvent, moduleState);
    }
  }

  private async executeEvent(moduleName: string, event: StatefulEvent, moduleState: ModuleState): Promise<void> {
    switch (event.event.eventType) {
      case 'BeforeDeployEvent': {
        await this.eventHandler.executeBeforeDeployEventHook(moduleName, event.event as BeforeDeployEvent, moduleState);
        break;
      }
      case 'AfterDeployEvent': {
        await this.eventHandler.executeAfterDeployEventHook(moduleName, event.event as AfterDeployEvent, moduleState);
        break;
      }
      case 'AfterDeploymentEvent': {
        await this.eventHandler.executeAfterDeploymentEventHook(moduleName, event.event as AfterDeploymentEvent, moduleState);
        break;
      }
      case 'BeforeDeploymentEvent': {
        await this.eventHandler.executeBeforeDeploymentEventHook(moduleName, event.event as BeforeDeploymentEvent, moduleState);
        break;
      }
      case 'BeforeCompileEvent': {
        await this.eventHandler.executeBeforeCompileEventHook(moduleName, event.event as BeforeCompileEvent, moduleState);
        break;
      }
      case 'AfterCompileEvent': {
        await this.eventHandler.executeAfterCompileEventHook(moduleName, event.event as AfterCompileEvent, moduleState);
        break;
      }
      case 'OnChangeEvent': {
        await this.eventHandler.executeOnChangeEventHook(moduleName, event.event as OnChangeEvent, moduleState);
        break;
      }
      case 'OnStart': {
        await this.eventHandler.executeOnStartModuleEventHook(moduleName, event.event as ModuleEvent, moduleState);
        break;
      }
      case 'OnCompletion': {
        await this.eventHandler.executeOnCompletionModuleEventHook(moduleName, event.event as ModuleEvent, moduleState);
        break;
      }
      case 'OnSuccess': {
        await this.eventHandler.executeOnSuccessModuleEventHook(moduleName, event.event as ModuleEvent, moduleState);
        break;
      }
      case 'OnFail': {
        await this.eventHandler.executeOnFailModuleEventHook(moduleName, event.event as ModuleEvent, moduleState);
        break;
      }
      default: {
        throw new CliError(`Failed to match event type with user event hooks - ${event.event.eventType}`);
      }
    }

    if (checkIfExist((event.event as ContractEvent)?.deps)) {
      const deps = (event.event as ContractEvent).deps;
      for (const depName of deps) {
        await this.moduleState.storeSingleBinding(moduleState[depName] as ContractBinding);
      }
    }
  }

  private async executeSingleBinding(binding: ContractBinding, moduleState: ModuleState): Promise<ContractBinding> {
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

    if (binding.deployMetaData.deployFn) {
      await this.moduleState.setSingleEventName(`Deploy${binding.name}`);
      const contractAddress = await binding.deployMetaData.deployFn();
      await this.moduleState.finishCurrentEvent();

      binding.deployMetaData.contractAddress = contractAddress;
      if (!checkIfExist(binding.deployMetaData?.lastEventName)) {
        binding.deployMetaData.logicallyDeployed = true;
      }

      moduleState[binding.name] = binding;

      return binding;
    }

    let bytecode: string = binding.bytecode as string;
    const values: any[] = [];
    const types: any[] = [];

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
          if (!checkIfExist(dependencyTxData) || !checkIfExist(dependencyTxData.input) || !checkIfExist(dependencyTxData.output)) {
            throw new ContractTypeMismatch(`Dependency contract not deployed \n Binding name: ${binding.name} \n Dependency name: ${binding.args[i].name}`);
          }

          if (!checkIfExist(dependencyDeployData.contractAddress)) {
            throw new ContractTypeMismatch(`No contract address in dependency tree \n Binding name: ${binding.name} \n Dependency name: ${binding.args[i].name}`);
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
    const txReceipt = await this.sendTransaction(binding, signedTx);

    binding.txData = binding.txData as TransactionData;
    binding.txData.output = txReceipt;

    binding.deployMetaData.contractAddress = txReceipt.contractAddress;
    if (!checkIfExist(binding.deployMetaData?.lastEventName)) {
      binding.deployMetaData.logicallyDeployed = true;
    }

    moduleState[binding.name] = binding;

    return binding;
  }

  private async sendTransaction(binding: ContractBinding, signedTx: string): Promise<TransactionReceipt> {
    return new Promise(async (resolve) => {
      binding.txData = binding.txData as TransactionData;

      this.prompter.sendingTx();
      const txResp = await this.ethers.sendTransaction(signedTx);
      this.prompter.sentTx();

      this.prompter.waitTransactionConfirmation();
      let txReceipt = await txResp.wait(1);
      binding.txData.output = txReceipt;
      await this.moduleState.storeSingleBinding(binding);
      this.prompter.transactionConfirmation(1);

      this.prompter.waitTransactionConfirmation();
      txReceipt = await txResp.wait(BLOCK_CONFIRMATION_NUMBER);
      binding.txData.output = txReceipt;
      await this.moduleState.storeSingleBinding(binding);
      this.prompter.transactionConfirmation(BLOCK_CONFIRMATION_NUMBER);

      resolve(txReceipt);
    });
  }
}
