import { TransactionReceipt } from "@ethersproject/abstract-provider";

import {
  ContractBinding,
  ContractBindingMetaData,
  ContractEvent,
  ContractInput,
  Deployed,
  EventTransactionData,
  EventType,
  MetaDataEvent,
  StatefulEvent,
} from "../../../../interfaces/hardhat-ignition";
import { CliError } from "../../../types/errors";
import { ModuleState, ModuleStateFile } from "../../../types/module";
import { checkIfExist } from "../../../utils/util";
import { IModuleState, IModuleStateCleanup } from "../module";

import { IModuleStateRepo } from "./index";

export class ModuleStateRepo implements IModuleStateRepo {
  public static convertBindingToMetaData(
    binding: ContractBinding | ContractBindingMetaData
  ): ContractBindingMetaData {
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
          this.convertDeployMetaData(argBinding.deployMetaData)
        );
      }
    }

    return new ContractBindingMetaData(
      binding.name,
      binding.contractName,
      binding.args,
      binding.bytecode,
      binding.abi,
      binding.library,
      binding.libraries,
      binding.txData,
      this.convertDeployMetaData(binding.deployMetaData)
    );
  }

  public static convertDeployMetaData(deployMetaData: Deployed): Deployed {
    const deployed = deployMetaData;

    deployed.deploymentSpec = {
      deployFn: deployMetaData.deploymentSpec?.deployFn,
      deps: (deployed.deploymentSpec?.deps ?? [])?.map(
        (element: ContractBinding | ContractBindingMetaData) => {
          return ModuleStateRepo.convertBindingToMetaData(element);
        }
      ),
    };

    return deployed;
  }

  public static convertStatesToMetaData(
    moduleState: ModuleState | null
  ): { [p: string]: ContractBindingMetaData | StatefulEvent } {
    const metaData: {
      [p: string]: ContractBindingMetaData | StatefulEvent;
    } = {};
    if (moduleState === null) {
      return metaData;
    }

    for (let [stateElementName, stateElement] of Object.entries(moduleState)) {
      if (
        (stateElement as ContractBinding)._isContractBinding ||
        ((stateElement as unknown) as ContractBindingMetaData)
          ._isContractBindingMetaData ||
        checkIfExist(((stateElement as unknown) as ContractBinding)?.bytecode)
      ) {
        stateElement = stateElement as ContractBinding;
        metaData[stateElementName] = ModuleStateRepo.convertBindingToMetaData(
          stateElement
        );

        continue;
      }

      stateElement = stateElement as StatefulEvent;
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

  public mutex: boolean;

  public readonly networkName: string;
  public stateRepo: IModuleState;
  public currentModuleName: string;
  public currentEventName: string;
  public readonly test: boolean;

  constructor(
    networkName: string,
    currentPath: string,
    mutex: boolean = false,
    stateRepo: IModuleState,
    testEnv: boolean
  ) {
    this.mutex = mutex;
    this.networkName = networkName;
    this.stateRepo = stateRepo;
    this.currentModuleName = "";
    this.currentEventName = "";
    this.test = testEnv;
  }

  public initStateRepo(moduleName: string): void {
    this.currentModuleName = moduleName;
  }

  public clear() {
    if (!this.test) {
      throw new CliError("Module state repo is not suitable for memory clear");
    }

    ((this.stateRepo as unknown) as IModuleStateCleanup).clear();
  }

  public async getStateIfExist(moduleName: string): Promise<ModuleStateFile> {
    // implement cashing and merging functionality
    return this.stateRepo.getModuleState(this.networkName, moduleName);
  }

  public async storeNewState(
    moduleName: string,
    moduleState: ModuleState | ModuleStateFile | null
  ): Promise<void> {
    await this.stateRepo.storeStates(this.networkName, moduleName, moduleState);
  }

  public setSingleEventName(currentEventName: string): void {
    this.currentEventName = currentEventName;
  }

  public getSingleEventName(): string {
    return this.currentEventName;
  }

  public async finishCurrentEvent(
    moduleName: string,
    moduleStates: ModuleState,
    eventName?: string
  ): Promise<void> {
    const currEventName = eventName ?? this.currentEventName;
    const currentState = await this.getStateIfExist(moduleName);
    const currentEvent = currentState[currEventName] as StatefulEvent;
    if (!checkIfExist(currentEvent)) {
      throw new CliError(
        `Cant finish event that doesn't exist in state - ${currEventName}`
      );
    }

    currentEvent.executed = true;
    moduleStates[currEventName] = currentEvent;

    await this.storeNewState(this.currentModuleName, moduleStates);
    this.currentEventName = "";
  }

  public async finishCurrentModuleEvent(
    moduleName: string,
    moduleState: ModuleState,
    eventType: EventType,
    eventName?: string
  ): Promise<void> {
    const currEventName = eventName ?? this.currentEventName;
    const currentState = await this.getStateIfExist(moduleName);
    let currentEvent = currentState[currEventName] as StatefulEvent;

    if (
      eventType === EventType.ON_FAIL ||
      eventType === EventType.ON_SUCCESS ||
      eventType === EventType.ON_COMPLETION
    ) {
      currentEvent = new StatefulEvent(
        {
          name: currEventName,
          eventType,
        },
        true,
        {}
      );
    }

    if (!checkIfExist(currentEvent)) {
      throw new CliError(
        `Cant finish event that doesn't exist in state - ${currEventName}`
      );
    }

    currentEvent.executed = true;
    moduleState[currEventName] = currentEvent;

    await this.storeNewState(this.currentModuleName, moduleState);
    this.currentEventName = "";
  }

  public async getEventTransactionData(
    bindingName: string,
    eventName?: string
  ): Promise<EventTransactionData> {
    if (this.currentModuleName === "") {
      throw new CliError("Current module name is not set");
    }
    const currEventName = eventName ?? this.currentEventName;

    if (!checkIfExist(currEventName)) {
      throw new CliError("Current event name is not set");
    }

    const currentState = await this.getStateIfExist(this.currentModuleName);
    const eventState = currentState[currEventName] as StatefulEvent;
    if (
      !checkIfExist(eventState) ||
      !checkIfExist(eventState.txData) ||
      !checkIfExist(eventState.txData[bindingName])
    ) {
      return {
        contractInput: [],
        contractOutput: [],
      };
    }

    return eventState.txData[bindingName];
  }

  public async storeEventTransactionData(
    bindingName: string,
    contractInput?: ContractInput,
    contractOutput?: TransactionReceipt,
    eventName?: string
  ): Promise<void> {
    if (this.currentModuleName === "") {
      throw new CliError("Current module name is not set");
    }

    const currEventName = eventName ?? this.currentEventName;

    if (!checkIfExist(currEventName)) {
      throw new CliError("Current event name is not set");
    }

    const currentState = await this.getStateIfExist(this.currentModuleName);

    let currentEvent = currentState[currEventName] as StatefulEvent;
    if (!checkIfExist(currentEvent)) {
      // if event is not define in module it is custom deploy event..
      const event: MetaDataEvent = {
        name: currEventName,
        eventType: EventType.DEPLOY,
      };
      currentEvent = new StatefulEvent(event, false, {});
    }

    if (
      !checkIfExist(currentEvent.txData) ||
      !checkIfExist(currentEvent.txData[bindingName])
    ) {
      currentEvent.txData[bindingName] = {
        contractInput: [],
        contractOutput: [],
      };
    }

    if (contractInput !== undefined) {
      currentEvent.txData[bindingName].contractInput.push(contractInput);
    }
    if (contractOutput !== undefined) {
      currentEvent.txData[bindingName].contractOutput.push(contractOutput);
    }

    currentState[currEventName] = currentEvent;
    await this.storeNewState(this.currentModuleName, currentState);
  }

  public async storeSingleBinding(
    singleElement: ContractBinding
  ): Promise<void> {
    if (this.currentModuleName === "") {
      throw new CliError("Current module name is not set");
    }
    const currentState = await this.getStateIfExist(this.currentModuleName);

    currentState[singleElement.name] = ModuleStateRepo.convertBindingToMetaData(
      singleElement
    );
    await this.storeNewState(this.currentModuleName, currentState);
  }
}
