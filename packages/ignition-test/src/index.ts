import {
  IgnitionCore,
  IgnitionParams,
  IgnitionRepos,
  IgnitionServices,
  IIgnitionUsage,
  Module,
  ModuleParams,
  ModuleStateFile,
} from "ignition-core";

export interface ConfigFlags {
  networkId: string;
  networkName: string;
  rpcProvider?: string;
}

export class IgnitionTests implements IIgnitionUsage {
  public readonly networkName: string;
  public readonly core: IgnitionCore;

  constructor(
    params: IgnitionParams,
    services: IgnitionServices,
    repos: IgnitionRepos,
    moduleParams: ModuleParams = {}
  ) {
    this.networkName = params.networkName;
    params.test = true;
    this.core = new IgnitionCore(params, services, repos, moduleParams);
  }

  public async init() {
    await this.core.mustInit(
      this.core.params,
      this.core.customServices,
      this.core.repos,
      this.core.moduleParams
    );
  }

  public cleanup() {
    if (!this.core.moduleParams) {
      return;
    }

    this.core.moduleStateRepo?.clear();
  }

  public async setStateFile(moduleName: string, stateFile: ModuleStateFile) {
    if (!this.core.moduleStateRepo) {
      return;
    }
    await this.core.moduleStateRepo?.storeNewState(moduleName, stateFile);
  }

  public async getStateFile(moduleName: string): Promise<ModuleStateFile> {
    if (!this.core.moduleStateRepo) {
      return {};
    }

    return this.core.moduleStateRepo?.getStateIfExist(moduleName);
  }

  public async reInit(
    params: IgnitionParams,
    services: IgnitionServices,
    repos: IgnitionRepos,
    moduleParams: ModuleParams
  ) {
    await this.core.mustInit(params, services, repos, moduleParams);
  }

  public async deploy(m: Module): Promise<void> {
    await this.core.deploy(this.networkName, m, false);
  }

  public async diff(m: Module): Promise<void> {
    await this.core.diff(this.networkName, m, false);
  }
}
