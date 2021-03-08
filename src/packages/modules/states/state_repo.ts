import {
  ContractBinding,
  ContractBindingMetaData,
  ContractEvent,
  ContractInput, Deployed,
  EventTransactionData,
  EventType,
  MetaDataEvent, ModuleEvent,
  StatefulEvent,
} from '../../../interfaces/mortar';
import { CliError } from '../../types/errors';
import { TransactionRequest, TransactionResponse } from '@ethersproject/abstract-provider';
import { checkIfExist } from '../../utils/util';
import { FileSystemModuleState } from './module/file_system';
import { IModuleState, ModuleState, ModuleStateFile } from './module';
import { MemoryModuleState } from './module/memory';

export class ModuleStateRepo {
  // @ts-ignore
  private mutex: boolean;

  private readonly networkId: number;
  private stateRepo: IModuleState;
  private currentModuleName: string;
  private currentEventName: string;
  private readonly test: boolean;

  constructor(networkId: number, currentPath: string, mutex: boolean = false, testEnv: boolean = false) {
    this.mutex = mutex;
    this.networkId = networkId;
    this.stateRepo = testEnv ? new MemoryModuleState() : new FileSystemModuleState(currentPath);
    this.currentModuleName = '';
    this.currentEventName = '';
    this.test = testEnv;
  }

  initStateRepo(moduleName: string): void {
    this.currentModuleName = moduleName;
  }

  clear() {
    if (!this.test) {
      throw new CliError('Module state repo is not sutable for memory clear');
    }

    (this.stateRepo as MemoryModuleState).clear();
  }

  async getStateIfExist(moduleName: string): Promise<ModuleStateFile> {
    // implement cashing and merging functionality
    return this.stateRepo.getModuleState(this.networkId, moduleName);
  }

  async storeNewState(moduleName: string, moduleState: ModuleState | ModuleStateFile | null): Promise<void> {
    await this.stateRepo.storeStates(this.networkId, moduleName, moduleState);
  }

  setSingleEventName(currentEventName: string): void {
    this.currentEventName = currentEventName;
  }

  getSingleEventName(): string {
    return this.currentEventName;
  }

  async finishCurrentEvent(moduleName: string, moduleStates: ModuleState, eventName?: string): Promise<void> {
    const currEventName = eventName ? eventName : this.currentEventName;
    const currentState = (await this.getStateIfExist(moduleName));
    const currentEvent = (currentState[currEventName] as StatefulEvent);
    if (
      !checkIfExist(currentEvent)
    ) {
      throw new CliError(`Cant finish event that doesn't exist in state - ${currEventName}`);
    }

    currentEvent.executed = true;
    moduleStates[currEventName] = currentEvent;

    await this.storeNewState(this.currentModuleName, moduleStates);
    this.currentEventName = '';
  }

  async finishCurrentModuleEvent(moduleName: string, moduleState: ModuleState, eventType: EventType, eventName?: string): Promise<void> {
    const currEventName = eventName ? eventName : this.currentEventName;
    const currentState = (await this.getStateIfExist(moduleName));
    let currentEvent = (currentState[currEventName] as StatefulEvent);

    if (
      eventType == EventType.OnFail ||
      eventType == EventType.OnSuccess ||
      eventType == EventType.OnCompletion
    ) {
      currentEvent = new StatefulEvent(
        {
          name: currEventName,
          eventType: eventType,
        } as ModuleEvent,
        true,
        {}
      );
    }

    if (
      !checkIfExist(currentEvent)
    ) {
      throw new CliError(`Cant finish event that doesn't exist in state - ${currEventName}`);
    }

    currentEvent.executed = true;
    moduleState[currEventName] = currentEvent;

    await this.storeNewState(this.currentModuleName, moduleState);
    this.currentEventName = '';
  }

  async getEventTransactionData(bindingName: string, eventName?: string): Promise<EventTransactionData> {
    if (this.currentModuleName == '') {
      throw new CliError('Current module name is not set');
    }
    const currEventName = eventName ? eventName : this.currentEventName;

    if (!checkIfExist(currEventName)) {
      throw new CliError('Current event name is not set');
    }

    const currentState = (await this.getStateIfExist(this.currentModuleName));
    const eventState = (currentState[currEventName] as StatefulEvent);
    if (
      !checkIfExist(eventState) ||
      !checkIfExist(eventState.txData) ||
      !checkIfExist(eventState.txData[bindingName])
    ) {
      return {
        contractInput: [],
        contractOutput: []
      };
    }

    return eventState.txData[bindingName];
  }

  async storeEventTransactionData(bindingName: string, contractInput: ContractInput | TransactionRequest, contractOutput?: TransactionResponse, eventName?: string): Promise<void> {
    if (this.currentModuleName == '') {
      throw new CliError('Current module name is not set');
    }

    const currEventName = eventName ? eventName : this.currentEventName;

    if (!checkIfExist(currEventName)) {
      throw new CliError('Current event name is not set');
    }

    const currentState = (await this.getStateIfExist(this.currentModuleName));

    let currentEvent = (currentState[currEventName] as StatefulEvent);
    if (
      !checkIfExist(currentEvent)) {
      // if event is not define in module it is custom deploy event..
      const event = {
        name: currEventName,
        eventType: EventType.Deploy
      } as MetaDataEvent;
      currentEvent = new StatefulEvent(
        event,
        false,
        {});
    }

    if (
      !checkIfExist(currentEvent.txData) ||
      !checkIfExist(currentEvent.txData[bindingName])
    ) {
      currentEvent.txData[bindingName] = {
        contractInput: [],
        contractOutput: []
      };
    }

    currentEvent.txData[bindingName].contractInput.push(contractInput);
    if (contractOutput) {
      currentEvent.txData[bindingName].contractOutput.push(contractOutput);
    }

    currentState[currEventName] = currentEvent;
    await this.storeNewState(this.currentModuleName, currentState);
  }

  async storeSingleBinding(singleElement: ContractBinding): Promise<void> {
    if (this.currentModuleName == '') {
      throw new CliError('Current module name is not set');
    }
    const currentState = (await this.getStateIfExist(this.currentModuleName));

    currentState[singleElement.name] = ModuleStateRepo.convertBindingToMetaData(singleElement);
    await this.storeNewState(this.currentModuleName, currentState);
  }

  static convertBindingToMetaData(binding: ContractBinding | ContractBindingMetaData): ContractBindingMetaData {
    for (let i = 0; i < binding.args.length; i++) {
      if (checkIfExist((binding.args[i] as ContractBinding)?.bytecode)) {
        const argBinding = binding.args[i] as ContractBinding;
        binding.args[i] = new ContractBindingMetaData(
          argBinding.name,
          argBinding.contractName,
          argBinding.args,
          argBinding.bytecode,
          argBinding.abi,
          argBinding.library,
          argBinding.libraries,
          argBinding.txData,
          this.convertDeployMetaData(argBinding.deployMetaData),
        );
      }
    }

    return new ContractBindingMetaData(binding.name, binding.contractName, binding.args, binding.bytecode, binding.abi, binding.library, binding.libraries, binding.txData, this.convertDeployMetaData(binding.deployMetaData));
  }

  static convertDeployMetaData(deployMetaData: Deployed): Deployed {
    const deployed = deployMetaData;

    deployed.deploymentSpec = {
      deployFn: deployMetaData.deploymentSpec?.deployFn,
      deps: deployed.deploymentSpec?.deps?.map(
        (v: ContractBinding) => {
          return ModuleStateRepo.convertBindingToMetaData(v);
        }
      )
    };

    return deployed;
  }

  static convertStatesToMetaData(moduleState: ModuleState | { [p: string]: ContractBindingMetaData | StatefulEvent }): { [p: string]: ContractBindingMetaData | StatefulEvent } {
    const metaData: { [p: string]: ContractBindingMetaData | StatefulEvent } = {};

    for (let [stateElementName, stateElement] of Object.entries(moduleState)) {
      if (
        (stateElement as ContractBinding)._isContractBinding ||
        (stateElement as ContractBindingMetaData)._isContractBindingMetaData ||
        checkIfExist((stateElement as unknown as ContractBinding)?.bytecode)
      ) {
        stateElement = stateElement as ContractBinding;
        metaData[stateElementName] = ModuleStateRepo.convertBindingToMetaData(stateElement);

        continue;
      }

      const eventMetaData: MetaDataEvent = {
        name: stateElement.event.name,
        eventType: stateElement.event.eventType,
      };

      if (
        checkIfExist((stateElement.event as ContractEvent).deps) &&
        (stateElement.event as ContractEvent).deps.length > 0
      ) {
        eventMetaData.deps = (stateElement.event as ContractEvent).deps;
      }

      if (
        checkIfExist((stateElement.event as ContractEvent).eventDeps) &&
        (stateElement.event as ContractEvent).eventDeps.length > 0
      ) {
        eventMetaData.eventDeps = (stateElement.event as ContractEvent).eventDeps;
      }

      if (
        checkIfExist((stateElement.event as ContractEvent).usage) &&
        (stateElement.event as ContractEvent).usage.length > 0
      ) {
        eventMetaData.usage = (stateElement.event as ContractEvent).usage;
      }

      if (
        checkIfExist((stateElement.event as ContractEvent).eventUsage) &&
        (stateElement.event as ContractEvent).eventUsage.length > 0
      ) {
        eventMetaData.eventUsage = (stateElement.event as ContractEvent).eventUsage;
      }

      metaData[stateElementName] = new StatefulEvent(
        eventMetaData,
        stateElement.executed,
        stateElement.txData
      );
    }

    return metaData;
  }
}
