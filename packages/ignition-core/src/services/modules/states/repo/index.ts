import { TransactionReceipt } from "@ethersproject/abstract-provider";

import {
  ContractBinding,
  ContractInput,
  EventTransactionData,
  EventType,
} from "../../../../interfaces/hardhat_ignition";
import { ModuleState, ModuleStateFile } from "../../../types/module";

export interface IModuleStateRepo {
  initStateRepo(moduleName: string): void;

  clear(): void;

  getStateIfExist(moduleName: string): Promise<ModuleStateFile>;

  storeNewState(
    moduleName: string,
    moduleState: ModuleState | ModuleStateFile | null
  ): Promise<void>;

  setSingleEventName(currentEventName: string): void;

  getSingleEventName(): string;

  finishCurrentEvent(
    moduleName: string,
    moduleStates: ModuleState,
    eventName?: string
  ): Promise<void>;

  finishCurrentModuleEvent(
    moduleName: string,
    moduleState: ModuleState,
    eventType: EventType,
    eventName?: string
  ): Promise<void>;

  getEventTransactionData(
    bindingName: string,
    eventName?: string
  ): Promise<EventTransactionData>;

  storeEventTransactionData(
    bindingName: string,
    contractInput?: ContractInput,
    contractOutput?: TransactionReceipt,
    eventName?: string
  ): Promise<void>;

  storeSingleBinding(singleElement: ContractBinding): Promise<void>;
}
