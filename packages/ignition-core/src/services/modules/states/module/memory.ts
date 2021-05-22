import {
  IModuleState,
  IModuleStateCleanup,
  ModuleState,
  ModuleStateFile,
} from "./index";
import { ModuleStateRepo } from "../state_repo";
import { checkIfExist, copyValue } from "../../../utils/util";

export class MemoryModuleState implements IModuleState, IModuleStateCleanup {
  private state: {
    [networkName: string]: {
      [moduleName: string]: ModuleStateFile;
    };
  };

  constructor() {
    this.state = {};
  }

  clear() {
    this.state = {};
  }

  async getModuleState(
    networkName: string,
    moduleName: string
  ): Promise<ModuleStateFile> {
    if (!this.state[networkName]) {
      this.state[networkName] = {};
      return {};
    }
    if (!this.state[networkName][moduleName]) {
      this.state[networkName][moduleName] = {};
      return {};
    }

    return copyValue(this.state[networkName][moduleName]);
  }

  async storeStates(
    networkName: string,
    moduleName: string,
    moduleStates: ModuleState | null
  ): Promise<boolean> {
    if (moduleStates == undefined) {
      this.state[networkName][moduleName] = {};
      return true;
    }

    if (!this.state[networkName]) {
      this.state[networkName] = {};
    }
    if (!this.state[networkName][moduleName]) {
      this.state[networkName][moduleName] = {};
    }
    this.state[networkName][moduleName] = copyValue(
      ModuleStateRepo.convertStatesToMetaData(moduleStates)
    );

    return true;
  }

  checkIfSet(moduleName: string, networkId: string): boolean {
    return checkIfExist(this.state[networkId][moduleName]);
  }
}
