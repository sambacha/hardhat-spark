import { ModuleState, ModuleStateFile } from "../../../types/module";
import { checkIfExist, copyValue } from "../../../utils/util";
import { ModuleStateRepo } from "../repo/state-repo";

import { IModuleState, IModuleStateCleanup } from "./index";

export class MemoryModuleState implements IModuleState, IModuleStateCleanup {
  private _state: {
    [networkName: string]: {
      [moduleName: string]: ModuleStateFile;
    };
  };

  constructor() {
    this._state = {};
  }

  public clear() {
    this._state = {};
  }

  public async getModuleState(
    networkName: string,
    moduleName: string
  ): Promise<ModuleStateFile> {
    if (this._state[networkName] === undefined) {
      this._state[networkName] = {};
      return {};
    }
    if (this._state[networkName][moduleName] === undefined) {
      this._state[networkName][moduleName] = {};
      return {};
    }

    return copyValue(this._state[networkName][moduleName]);
  }

  public async storeStates(
    networkName: string,
    moduleName: string,
    moduleStates: ModuleState | null
  ): Promise<boolean> {
    if (moduleStates === undefined) {
      this._state[networkName][moduleName] = {};
      return true;
    }

    if (this._state[networkName] === undefined) {
      this._state[networkName] = {};
    }
    if (this._state[networkName][moduleName] === undefined) {
      this._state[networkName][moduleName] = {};
    }
    this._state[networkName][moduleName] = copyValue(
      ModuleStateRepo.convertStatesToMetaData(moduleStates)
    );

    return true;
  }

  public checkIfSet(moduleName: string, networkId: string): boolean {
    return checkIfExist(this._state[networkId][moduleName]);
  }
}
