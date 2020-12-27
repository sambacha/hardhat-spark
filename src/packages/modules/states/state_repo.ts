import {
  ContractBinding,
  ContractBindingMetaData, ContractEvent,
  ContractInput,
  EventTransactionData,
  StatefulEvent,
  MetaDataEvent
} from '../../../interfaces/mortar';
import { CliError } from '../../types/errors';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { checkIfExist } from '../../utils/util';
import { FileSystemModuleState } from './module/file_system';
import { IModuleState, ModuleState } from './module';

export class ModuleStateRepo {
  private readonly networkId: number;
  private stateRepo: IModuleState;
  private currentModuleName: string;
  private currentEventName: string;

  constructor(networkId: number, currentPath: string) {
    this.networkId = networkId;
    this.stateRepo = new FileSystemModuleState(currentPath);
    this.currentModuleName = '';
    this.currentEventName = '';
  }

  initStateRepo(moduleName: string): void {
    // @TODO add possibility to pass custom state repo
    this.currentModuleName = moduleName;
  }

  async getStateIfExist(moduleName: string): Promise<ModuleState> {
    return this.stateRepo.getModuleState(this.networkId, moduleName);
  }

  async storeNewState(moduleName: string, moduleState: ModuleState | null): Promise<void> {
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

    const currentEvent = (currentState[this.currentEventName] as StatefulEvent);
    if (
      !checkIfExist(currentEvent) ||
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

    currentState[singleElement.name] = singleElement;
    await this.storeNewState(this.currentModuleName, currentState);
  }

  static convertBindingToMetaData(binding: ContractBinding): ContractBindingMetaData {
    return new ContractBindingMetaData(binding.name, binding.contractName, binding.args, binding.bytecode, binding.abi, binding.libraries, binding.txData);
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
          stateElement.txData
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
        eventMetaData.deps = (stateElement.event as ContractEvent).deps.filter((value) => {
          return !value?.name;
        }).map(value => value.name);
      }

      if (
        checkIfExist((stateElement.event as ContractEvent).eventDeps) &&
        (stateElement.event as ContractEvent).eventDeps.length > 0
      ) {
        eventMetaData.eventDeps = (stateElement.event as ContractEvent).eventDeps.filter((value) => {
          return !value?.name;
        }).map(value => value.name);
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
