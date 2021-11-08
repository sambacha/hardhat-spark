import { TransactionReceipt } from "@ethersproject/abstract-provider";

import { JsonFragmentType } from "../../../types/artifacts/abi";
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
    eventType: string,
    eventName?: string
  ): Promise<void>;

  getEventTransactionData(
    bindingName: string,
    eventName?: string
  ): Promise<{
    contractInput: Array<{
      functionName: string;
      inputs: JsonFragmentType[];
    }>;
    contractOutput: TransactionReceipt[];
  }>;

  storeEventTransactionData(
    bindingName: string,
    contractInput?: {
      functionName: string;
      inputs: JsonFragmentType[];
    },
    contractOutput?: TransactionReceipt,
    eventName?: string
  ): Promise<void>;

  storeSingleBinding(singleElement: any): Promise<void>;
}
