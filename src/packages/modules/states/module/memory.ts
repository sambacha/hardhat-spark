import { IModuleState, ModuleState, ModuleStateFile } from './index';
import { ModuleStateRepo } from '../state_repo';
import { checkIfExist } from '../../../utils/util';

export class MemoryModuleState implements IModuleState {
  private mutex: boolean;
  private state: {
    [networkId: string]: {
      [moduleName: string]: ModuleStateFile
    }
  };

  constructor(mutex: boolean) {
    this.mutex = mutex;
    this.state = {};
  }

  async getModuleState(networkId: number, moduleName: string): Promise<ModuleStateFile> {
    if (!this.state[networkId]) {
      return {};
    }
    if (!this.state[networkId][moduleName]) {
      return {};
    }

    return this.state[networkId][moduleName];
  }

  async storeStates(networkId: number, moduleName: string, moduleStates: ModuleState | null): Promise<boolean> {
    if (moduleStates == undefined) {
      return true;
    }

    if (!this.state[networkId]) {
      this.state[networkId] = {};
    }
    if (!this.state[networkId][moduleName]) {
      this.state[networkId][moduleName] = {};
    }

    this.state[networkId][moduleName] = ModuleStateRepo.convertStatesToMetaData(moduleStates);

    return true;
  }

  checkIfSet(moduleName: string, networkId: number): boolean {
    return checkIfExist(this.state[networkId][moduleName]);
  }
}
