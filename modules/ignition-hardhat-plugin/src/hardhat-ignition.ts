import {
  DeployArgs,
  DiffArgs,
  GenTypesArgs,
  IGasProvider,
  IgnitionCore,
  IgnitionParams,
  IgnitionServices,
  INonceManager,
  ITransactionSigner,
  Module,
  ModuleParams,
} from "ignition-core";

export type Args = DeployArgs | DiffArgs | GenTypesArgs;

export interface IHardhatIgnition {
  deploy(m: Module, networkName: string): Promise<void>;

  diff(module: Module, networkName: string): Promise<void>;

  genTypes(module: Module, deploymentFolder: string): Promise<void>;
}

export interface HardhatIgnitionConfig {
  logging?: boolean;
  test?: boolean;
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
    moduleParams?: ModuleParams
  ) {
    this._ignitionCore = new IgnitionCore(params, services, moduleParams);
  }

  public async deploy(module: Module, networkName: string): Promise<void> {
    await this._ignitionCore.deploy(networkName, module);
  }

  public async diff(module: Module, networkName: string): Promise<void> {
    await this._ignitionCore.diff(networkName, module);
  }

  public async genTypes(
    module: Module,
    deploymentFolder: string
  ): Promise<void> {
    await this._ignitionCore.genTypes(module, deploymentFolder);
  }
}
