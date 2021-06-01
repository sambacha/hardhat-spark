import { ModuleState, ModuleStateFile } from "../../../types/module";

export const STATE_DIR_NAME = ".hardhat-ignition";
export const STATE_NAME = "deployed_module_state.json";

export interface IModuleState {
  getModuleState(
    networkName: string,
    moduleName: string
  ): Promise<ModuleStateFile>;

  storeStates(
    networkName: string,
    moduleName: string,
    moduleState: ModuleState | ModuleStateFile | null
  ): Promise<boolean>;

  checkIfSet(moduleName: string, networkName: string): boolean;
}

export interface IModuleStateCleanup {
  clear(): void;
}
