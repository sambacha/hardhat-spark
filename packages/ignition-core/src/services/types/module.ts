import {
  ContractBinding,
  ContractBindingMetaData,
  StatefulEvent,
} from "../../interfaces/hardhat_ignition";

export interface ModuleState {
  [p: string]: ContractBinding | StatefulEvent;
}

export interface ModuleStateFile {
  [p: string]: ContractBindingMetaData | StatefulEvent;
}

export interface ModuleBindings {
  [name: string]: ContractBinding;
}
