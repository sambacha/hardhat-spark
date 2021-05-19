import './hardhat_plugin';

import {
  IgnitionCore,
  DeployArgs,
  DiffArgs,
  GenTypesArgs,
  IgnitionParams,
  IgnitionServices,
  IgnitionRepos,
  ModuleParams,
  Module,
  GasPriceBackoff,
  IModuleRegistryResolver,
  INonceManager,
  ITransactionSigner,
  IGasProvider,
} from 'ignition-core';

export type Args = DeployArgs | DiffArgs | GenTypesArgs;

export interface IHardhatIgnition {
  init(logging?: boolean, test?: boolean): Promise<void>;

  deploy(
    m: Module,
    networkName: string,
    logging?: boolean,
    test?: boolean
  ): Promise<void>;

  diff(module: Module, networkName: string, logging?: boolean): Promise<void>;

  genTypes(module: Module, deploymentFolder: string): Promise<void>;
}

export type HardhatIgnitionConfig = {
  parallelizeDeployment?: boolean;
  logging?: boolean;
  test?: boolean;
  blockConfirmation?: number;
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasProvider;
  nonceManager?: INonceManager;
  transactionSigner?: ITransactionSigner;
  gasPriceBackoff?: GasPriceBackoff;
  moduleParams?: { [name: string]: any };
};

export class HardhatIgnition implements IHardhatIgnition {
  private readonly ignitionCore: IgnitionCore;

  constructor(
    params: IgnitionParams,
    services: IgnitionServices,
    repos: IgnitionRepos,
    moduleParams?: ModuleParams
  ) {
    this.ignitionCore = new IgnitionCore(params, services, repos, moduleParams);
  }

  async init(
    logging: boolean = true,
    test: boolean = true
  ): Promise<void> {
    this.ignitionCore.params.logging = logging;
    this.ignitionCore.params.test = test;
    await this.ignitionCore.mustInit(this.ignitionCore.params);
  }

  async deploy(
    module: Module,
    networkName: string,
    logging?: boolean,
    test?: boolean
  ): Promise<void> {
    await this.ignitionCore.deploy(networkName, module, logging);
  }

  async diff(
    module: Module,
    networkName: string,
    logging?: boolean
  ): Promise<void> {
    await this.ignitionCore.diff(networkName, module, logging);
  }

  async genTypes(module: Module, deploymentFolder: string): Promise<void> {
    await this.ignitionCore.genTypes(module, deploymentFolder);
  }
}
