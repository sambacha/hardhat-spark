import {
  ContractBinding,
  StatefulEvent
} from '../../../../interfaces/mortar';

export type ModuleState = { [p: string]: ContractBinding | StatefulEvent };
export const STATE_DIR_NAME = '.mortar';
export const STATE_NAME = 'deployed_module_state.json';

export interface IModuleState {
  getModuleState(networkId: number, moduleName: string): Promise<ModuleState>;
  storeStates(networkId: number, moduleName: string, moduleState: ModuleState | null): Promise<boolean>;
  checkIfSet(moduleName: string , networkId: number): boolean;
}
