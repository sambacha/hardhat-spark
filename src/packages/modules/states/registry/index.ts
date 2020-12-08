import {DeployedContractBinding} from "../../../../interfaces/mortar";

export type ModuleState = { [p: string]: DeployedContractBinding }
export const STATE_DIR_NAME = '.mortar'
export const STATE_NAME = 'deployed_module_state.json'

export interface IStateRegistryResolver {
  getModuleState(networkId: number, moduleName: string): Promise<ModuleState>;
  storeStates(networkId: number, moduleName: string, bindings: ModuleState | null): Promise<boolean>;
  checkIfSet(moduleName: string ,networkId: number): boolean
}
