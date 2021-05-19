import * as path from 'path';
import {
  IgnitionCore,
  IIgnitionUsage,
  ModuleStateFile,
  Module,
  IgnitionParams,
  IgnitionServices,
  IgnitionRepos,
  ModuleParams,
} from 'ignition-core';

export type ConfigFlags = {
  networkId: string;
  networkName: string;
  rpcProvider?: string;
};

export class IgnitionTests implements IIgnitionUsage {
  public readonly networkName: string;
  public readonly core: IgnitionCore;

  constructor(
    params: IgnitionParams,
    services: IgnitionServices,
    repos: IgnitionRepos,
    moduleParams: ModuleParams = {},
  ) {
    this.networkName = params.networkName;
    params.test = true;
    this.core = new IgnitionCore(params, services, repos, moduleParams);
  }

  async init() {
    await this.core.mustInit(
      this.core.params,
      this.core.customServices,
      this.core.repos,
      this.core.moduleParams,
    );
  }

  cleanup() {
    // @ts-ignore
    this.core.moduleStateRepo.clear();
  }

  async setStateFile(moduleName: string, stateFile: ModuleStateFile) {
    // @ts-ignore
    await this.core.moduleStateRepo.storeNewState(moduleName, stateFile);
  }

  async getStateFile(moduleName: string): Promise<ModuleStateFile> {
    // @ts-ignore
    return this.core.moduleStateRepo.getStateIfExist(moduleName);
  }

  async reInit(
    params: IgnitionParams,
    services: IgnitionServices,
    repos: IgnitionRepos,
    moduleParams: ModuleParams,
  ) {
    await this.core.mustInit(params, services, repos, moduleParams);
  }

  async deploy(m: Module): Promise<void> {
    await this.core.deploy(this.networkName, m, false);
  }

  async diff(m: Module): Promise<void> {
    await this.core.diff(this.networkName, m, false);
  }
}
