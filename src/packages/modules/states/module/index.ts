import {
  ContractBinding, ContractBindingMetaData,
  StatefulEvent
} from '../../../../interfaces/ignition';

export type ModuleState = { [p: string]: ContractBinding | StatefulEvent };
export type ModuleStateFile = { [p: string]: ContractBindingMetaData | StatefulEvent };
export const STATE_DIR_NAME = '.ignition';
export const STATE_NAME = 'deployed_module_state.json';

export interface IModuleState {
  getModuleState(networkId: number, moduleName: string): Promise<ModuleStateFile>;
  storeStates(networkId: number, moduleName: string, moduleState: ModuleState | ModuleStateFile | null): Promise<boolean>;
  checkIfSet(moduleName: string , networkId: number): boolean;
}

export interface IModuleStateCleanup {
  clear();
}
