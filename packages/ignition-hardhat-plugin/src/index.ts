import {
  DeployArgs,
  DiffArgs,
  GenTypesArgs,
  IGasProvider,
  IgnitionCore,
  IgnitionParams,
  IgnitionRepos,
  IgnitionServices,
  IModuleRegistryResolver,
  INonceManager,
  ITransactionSigner,
  Module,
  ModuleParams,
} from "ignition-core";

import "./hardhat_plugin";

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

export interface HardhatIgnitionConfig {
  logging?: boolean;
  test?: boolean;
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasProvider;
  nonceManager?: INonceManager;
  transactionSigner?: ITransactionSigner;
  moduleParams?: { [name: string]: any };
}

export class HardhatIgnition implements IHardhatIgnition {
  private readonly _ignitionCore: IgnitionCore;

  constructor(
    params: IgnitionParams,
    services: IgnitionServices,
    repos: IgnitionRepos,
    moduleParams?: ModuleParams
  ) {
    this._ignitionCore = new IgnitionCore(
      params,
      services,
      repos,
      moduleParams
    );
  }

  public async init(
    logging: boolean = true,
    test: boolean = true
  ): Promise<void> {
    this._ignitionCore.params.logging = logging;
    this._ignitionCore.params.test = test;
    await this._ignitionCore.mustInit(this._ignitionCore.params);
  }

  public async deploy(
    module: Module,
    networkName: string,
    logging?: boolean,
    test?: boolean
  ): Promise<void> {
    await this._ignitionCore.deploy(networkName, module, logging, test);
  }

  public async diff(
    module: Module,
    networkName: string,
    logging?: boolean
  ): Promise<void> {
    await this._ignitionCore.diff(networkName, module, logging);
  }

  public async genTypes(
    module: Module,
    deploymentFolder: string
  ): Promise<void> {
    await this._ignitionCore.genTypes(module, deploymentFolder);
  }
}
