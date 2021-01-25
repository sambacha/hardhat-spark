import {
  ContractBinding,
  ContractBindingMetaData, ContractEvent,
  ContractInput,
  EventTransactionData,
  StatefulEvent,
  MetaDataEvent,
  ModuleEvent, EventType,
} from '../../../interfaces/mortar';
import { CliError } from '../../types/errors';
import { TransactionResponse } from '@ethersproject/abstract-provider';
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
  private test: boolean;

  constructor(networkId: number, currentPath: string, mutex: boolean = false, testEnv: boolean = false) {
    this.mutex = mutex;
    this.networkId = networkId;
    this.stateRepo = testEnv ? new MemoryModuleState(mutex) : new FileSystemModuleState(currentPath, mutex);
    this.currentModuleName = '';
    this.currentEventName = '';
    this.test = testEnv;
  }

  initStateRepo(moduleName: string): void {
    // @TODO add possibility to pass custom state repo
    this.currentModuleName = moduleName;
  }

  async getStateIfExist(moduleName: string): Promise<ModuleStateFile> {
    return this.stateRepo.getModuleState(this.networkId, moduleName);
  }

  async storeNewState(moduleName: string, moduleState: ModuleState | ModuleStateFile | null): Promise<void> {
    await this.stateRepo.storeStates(this.networkId, moduleName, moduleState);
  }

  async setSingleEventName(currentEventName: string): Promise<void> {
    this.currentEventName = currentEventName;
  }

  async finishCurrentEvent(): Promise<void> {
    const currentState = (await this.getStateIfExist(this.currentModuleName));
    const currentEvent = (currentState[this.currentEventName] as StatefulEvent);
    if (
      !checkIfExist(currentEvent)
    ) {
      throw new CliError("Cant finish event that doesn't exist in state");
    }

    currentEvent.executed = true;
    currentState[this.currentEventName] = currentEvent;

    await this.storeNewState(this.currentModuleName, currentState);
    this.currentEventName = '';
  }

  async finishCurrentModuleEvent(eventType: string): Promise<void> {
    const currentState = (await this.getStateIfExist(this.currentModuleName));
    let currentEvent = (currentState[this.currentEventName] as StatefulEvent);
    if (
      !checkIfExist(currentEvent)
    ) {
      currentEvent = new StatefulEvent(
        {
          name: this.currentEventName,
          eventType: eventType,
        } as ModuleEvent,
        true,
        {}
      );
    }

    currentEvent.executed = true;
    currentState[this.currentEventName] = currentEvent;

    await this.storeNewState(this.currentModuleName, currentState);
    this.currentEventName = '';
  }

  async getEventTransactionData(bindingName: string): Promise<EventTransactionData> {
    if (this.currentModuleName == '') {
      throw new CliError('Current module name is not set');
    }
    if (this.currentEventName == '') {
      throw new CliError('Current event name is not set');
    }

    const currentState = (await this.getStateIfExist(this.currentModuleName));
    const eventState = (currentState[this.currentEventName] as StatefulEvent);
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

  async storeEventTransactionData(bindingName: string, contractInput: ContractInput, contractOutput: TransactionResponse): Promise<void> {
    if (this.currentModuleName == '') {
      throw new CliError('Current module name is not set');
    }
    if (this.currentEventName == '') {
      throw new CliError('Current event name is not set');
    }

    const currentState = (await this.getStateIfExist(this.currentModuleName));

    let currentEvent = (currentState[this.currentEventName] as StatefulEvent);
    if (
      !checkIfExist(currentEvent)) {
      // if event is not define in module it is custom deploy event..
      const event = {
        name: this.currentEventName,
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
    currentEvent.txData[bindingName].contractOutput.push(contractOutput);

    currentState[this.currentEventName] = currentEvent;
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

  static convertBindingToMetaData(binding: ContractBinding): ContractBindingMetaData {
    for (let i = 0; i < binding.args.length; i++) {
      if (checkIfExist((binding.args[i] as ContractBinding)?.bytecode)) {
        const argBinding = binding.args[i] as ContractBinding;
        binding.args[i] = new ContractBindingMetaData(
          argBinding.name,
          argBinding.contractName,
          argBinding.args,
          argBinding.bytecode,
          argBinding.abi,
          argBinding.libraries,
          argBinding.txData,
          argBinding.deployMetaData,
        );
      }
    }

    return new ContractBindingMetaData(binding.name, binding.contractName, binding.args, binding.bytecode, binding.abi, binding.libraries, binding.txData, binding.deployMetaData);
  }

  static convertStatesToMetaData(moduleState: ModuleState | { [p: string]: ContractBindingMetaData | StatefulEvent }): { [p: string]: ContractBindingMetaData | StatefulEvent } {
    const metaData: { [p: string]: ContractBindingMetaData | StatefulEvent } = {};

    for (let [stateElementName, stateElement] of Object.entries(moduleState)) {
      if (
        stateElement instanceof ContractBinding ||
        stateElement instanceof ContractBindingMetaData ||
        checkIfExist((stateElement as unknown as ContractBinding)?.bytecode)
      ) {
        stateElement = stateElement as ContractBinding;
        metaData[stateElementName] = new ContractBindingMetaData(
          stateElement.name,
          stateElement.contractName,
          stateElement.args,
          stateElement.bytecode,
          stateElement.abi,
          stateElement.libraries,
          stateElement.txData,
          stateElement.deployMetaData,
        );

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
