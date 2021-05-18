import {
  IgnitionCore,
  IIgnitionUsage,
  ModuleStateFile,
  Module, IgnitionParams, IgnitionServices, IgnitionRepos, ModuleParams,
} from 'ignition-core';

export type ConfigFlags = {
  networkId: string;
  networkName: string;
  rpcProvider?: string;
};

export class IgnitionTests implements IIgnitionUsage {
  private readonly networkName: string;
  private readonly ignitionCore: IgnitionCore;

  // @TODO
  constructor(
    params: IgnitionParams,
    services: IgnitionServices,
    repos: IgnitionRepos,
    moduleParams?: ModuleParams
  ) {
    this.networkName = params.networkName;
    this.ignitionCore = new IgnitionCore(params, services, repos, moduleParams);
  }

  cleanup() {
    // @ts-ignore
    this.ignitionCore.moduleStateRepo.clear();
  }

  async setStateFile(moduleName: string, stateFile: ModuleStateFile) {
    // @ts-ignore
    await this.ignitionCore.moduleStateRepo.storeNewState(moduleName, stateFile);
  }

  async getStateFile(moduleName: string): Promise<ModuleStateFile> {
    // @ts-ignore
    return this.ignitionCore.moduleStateRepo.getStateIfExist(moduleName);
  }

  async reInit() {
    await this.ignitionCore.mustInit(this.networkName);
  }

  async deploy(m: Module): Promise<void> {
    await this.ignitionCore.deploy(
      this.networkName,
      m,
      false
    );
  }

  async diff(m: Module): Promise<void> {
    await this.ignitionCore.diff(
      this.networkName,
      m,
      false
    );
  }
}
