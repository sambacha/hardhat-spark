import {
  ContractBinding,
  ContractBindingMetaData,
  StatefulEvent,
} from "../../interfaces/hardhat-ignition";

// @TODO move this in a meaningful place once we separate hardhat_ignition.ts
export interface ModuleState {
  [p: string]: ContractBinding | StatefulEvent;
}

export interface ModuleStateFile {
  [p: string]: ContractBindingMetaData | StatefulEvent;
}

export interface ModuleBindings {
  [name: string]: ContractBinding;
}
