import { cli } from 'cli-ux';
import * as cls from 'cls-hooked';
import { Module } from './interfaces/hardhat_ignition';
import { checkIfExist } from './services/utils/util';
import { ModuleStateRepo } from './services/modules/states/state_repo';
import { ModuleResolver } from './services/modules/module_resolver';
import {
  EthTxGenerator,
  EventTxExecutor,
  TransactionManager,
  TxExecutor,
} from './services/ethereum/transactions';
import { ModuleState } from './services/modules/states/module';
import { ModuleTypings } from './services/modules/typings';
import { EmptyLogger, ILogging } from './services/utils/logging';
import { WalletWrapper } from './services/ethereum/wallet/wrapper';
import { ethers } from 'ethers';
import { GasPriceBackoff } from './services/types/config';
import {
  EmptySigners,
  ServicesNotInitialized,
} from './services/types/errors';
import { ModuleDeploymentSummaryService } from './services/modules/module_deployment_summary';
import {
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
  DEFAULT_RPC_PROVIDER,
} from './services/utils/constants';
import { OverviewLogger } from './services/utils/logging/react-terminal';
import { GlobalConfigService } from './services/config';
import { ErrorReporter } from './services/utils/analytics';
import { IErrorReporting } from './services/utils/analytics';
import { errorHandling } from './services/utils/util';
import { GasPriceCalculator } from './services/ethereum/gas';
import { EventHandler } from './services/modules/events/handler';
import { EthClient } from './services/ethereum/client';
import { IModuleRegistryResolver } from './services/modules/states/registry';
import { IGasProvider } from './services/ethereum/gas';
import {
  INonceManager,
  ITransactionSigner,
} from './services/ethereum/transactions';

export * from './interfaces/hardhat_ignition';
export * from './interfaces/helper/expectancy';
export * from './interfaces/helper/macros';

export * from './services/config';
export * from './services/types';
export * from './services/ethereum/compiler';
export * from './services/ethereum/gas';
export * from './services/ethereum/transactions';
export * from './services/ethereum/transactions/manager';
export * from './services/ethereum/wallet/wrapper';
export * from './services/modules/states/module';
export * from './services/modules/states/registry';
export * from './services/modules/states/registry/remote_bucket_storage';
export * from './services/modules/typings';
export * from './services/utils/util';
export * from './services/ethereum/gas/calculator';
export * from './services/ethereum/transactions/generator';
export * from './services/modules/states/state_repo';
export * from './services/modules/module_resolver';
export * from './services/modules/events/handler';
export * from './services/utils/logging';
export * from './services/types/migration';
export * from './services/modules/states/state_migration_service';
export * from './services/tutorial/tutorial_service';
export * from './services/tutorial/system_crawler';
export * from './services/tutorial/deployment_file_gen';
export * from './services/tutorial/deployment_file_repo';
export * from './services/modules/module_migration';
export * from './services/ethereum/client';
export * from './services/modules/module_usage';
export * from './services/modules/module_deployment_summary';
export * from './services/config';
export * from './services/types';
export * from './services/types/config';
export * from './services/utils/analytics';

export interface DiffArgs {
  moduleFilePath?: string;
  networkName: string;
  logging?: boolean;
  testEnv?: boolean;
}

export interface DeployArgs {
  moduleFilePath?: string;
  networkName: string;
  logging?: boolean;
  testEnv?: boolean;
}

export interface GenTypesArgs {
  deploymentFolder: string;
}

export interface IIgnition {
  deploy(
    networkName: string,
    module: Module,
    logging?: boolean,
    test?: boolean
  ): Promise<void>;

  diff(
    networkName: string,
    module: Module,
    logging?: boolean,
    test?: boolean
  ): Promise<void>;

  genTypes(module: Module, deploymentFolder: string): Promise<void>;
}

export interface IIgnitionUsage {
  deploy(module: Module, logging?: boolean, test?: boolean): Promise<void>;

  diff(module: Module, logging?: boolean, test?: boolean): Promise<void>;
}

export type IgnitionParams = {
  networkName: string;
  networkId: string;
  rpcProvider?: ethers.providers.JsonRpcProvider;
  signers?: Array<ethers.Signer>;
  logging?: boolean;
  parallelizeDeployment?: boolean;
  localDeployment?: boolean;
  blockConfirmation?: number;
  gasPriceBackoffMechanism?: GasPriceBackoff;
  test?: boolean;
};

export type IgnitionServices = {
  gasPriceProvider?: IGasProvider;
  nonceManager?: INonceManager;
  transactionSigner?: ITransactionSigner;
};

export type IgnitionRepos = {
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
};

export type ModuleParams = { [name: string]: any };

export class IgnitionCore implements IIgnition {
  private _initialized: boolean = false;

  public params: IgnitionParams;
  public customServices: IgnitionServices;
  public repos: IgnitionRepos;
  public moduleParams: ModuleParams;

  private networkName: string | undefined;
  private networkId: string | undefined;
  private gasPriceBackoff: GasPriceBackoff | undefined;
  private rpcProvider: ethers.providers.JsonRpcProvider | undefined;
  private signers: Array<ethers.Signer> | undefined;
  private logger: ILogging | undefined;

  private gasProvider: IGasProvider | undefined;
  private eventSession: cls.Namespace | undefined;
  private moduleStateRepo: ModuleStateRepo | undefined;
  private moduleResolver: ModuleResolver | undefined;
  private txGenerator: EthTxGenerator | undefined;
  private txExecutor: TxExecutor | undefined;
  private walletWrapper: WalletWrapper | undefined;
  private moduleDeploymentSummaryService:
    | ModuleDeploymentSummaryService
    | undefined;

  private errorReporter: IErrorReporting | undefined;
  private moduleTyping: ModuleTypings | undefined;

  constructor(
    params: IgnitionParams,
    services: IgnitionServices,
    repos: IgnitionRepos,
    moduleParams: ModuleParams = {}
  ) {
    this.params = params;
    this.customServices = services;
    this.repos = repos;
    this.moduleParams = moduleParams;
  }

  async mustInit(
    params?: IgnitionParams,
    services?: IgnitionServices,
    repos?: IgnitionRepos,
    moduleParams?: ModuleParams
  ) {
    if (params) {
      this.params = params;
    }
    if (services) {
      this.customServices = services;
    }
    if (repos) {
      this.repos = repos;
    }
    if (moduleParams) {
      this.moduleParams = moduleParams;
    }
    const {
      networkId,
      gasPriceBackoff,
      rpcProvider,
      signers,
      logger,

      gasProvider,
      eventSession,
      moduleStateRepo,
      moduleResolver,
      txGenerator,
      txExecutor,
      walletWrapper,
      moduleDeploymentSummaryService,

      errorReporter,
      moduleTyping,
    } = await setupServicesAndEnvironment(
      this.params,
      this.customServices,
      this.repos
    );

    this.networkName = this.params.networkName;
    this.networkId = networkId;
    this.gasPriceBackoff = gasPriceBackoff;
    this.rpcProvider = rpcProvider;
    this.signers = signers;
    this.logger = logger;

    this.gasProvider = gasProvider;
    this.eventSession = eventSession;
    this.moduleStateRepo = moduleStateRepo;
    this.moduleResolver = moduleResolver;
    this.txGenerator = txGenerator;
    this.txExecutor = txExecutor;
    this.walletWrapper = walletWrapper;
    this.moduleDeploymentSummaryService = moduleDeploymentSummaryService;

    this.errorReporter = errorReporter;
    this.moduleTyping = moduleTyping;

    this._initialized = true;
  }

  async deploy(
    networkName: string,
    module: Module,
    logging?: boolean,
    test?: boolean
  ) {
    try {
      if (!this._initialized) {
        await this.mustInit(this.params, this.customServices, this.repos);
      }

      if (this.params.logging != logging) {
        await this.reInitLogger(!!logging);
      }

      if (
        !this.moduleStateRepo ||
        !this.logger ||
        !this.txGenerator ||
        !this.moduleResolver ||
        !this.txExecutor ||
        !this.moduleDeploymentSummaryService
      ) {
        throw new ServicesNotInitialized();
      }

      // wrapping ether.Wallet in order to support state file storage
      const signers = this.signers || [];
      const ignitionWallets = this.walletWrapper?.wrapSigners(signers);

      const moduleName = module.name;

      // If a module is initialized it means it is sub module inside the bigger one. Only modules that are not initialized
      // can be executed.
      if (module.isInitialized()) {
        return;
      }

      // ability to surface module's context when using subModule functionality
      const moduleSession = cls.createNamespace('module');
      await moduleSession.runAndReturn(async () => {
        await module.init(
          moduleSession,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          {
            params: this.moduleParams || {},
          }
        );
      });
      this.moduleStateRepo.initStateRepo(moduleName);

      // merging state file with provided states files
      const stateFileRegistry = await this.moduleStateRepo.getStateIfExist(
        moduleName
      );

      this.logger.startModuleResolving(moduleName);
      // resolving contract and events dependencies and determining execution order
      const moduleState: ModuleState | null = await this.moduleResolver.resolve(
        module.getAllBindings(),
        module.getAllEvents(),
        module.getAllModuleEvents(),
        stateFileRegistry
      );
      this.logger.finishModuleResolving(moduleName);

      // setting up custom functionality
      if (
        module.getCustomGasPriceProvider() &&
        this.customServices.gasPriceProvider
      ) {
        this.txGenerator.changeGasPriceCalculator(
          this.customServices.gasPriceProvider
        );
      }

      if (module.getCustomNonceManager() && this.customServices.nonceManager) {
        this.txGenerator.changeNonceManager(this.customServices.nonceManager);
      }

      if (
        module.getCustomTransactionSigner() &&
        this.customServices.transactionSigner
      ) {
        this.txGenerator.changeTransactionSigner(
          this.customServices.transactionSigner
        );
      }

      const initializedTxModuleState = await this.txGenerator.initTx(
        moduleState
      );
      await this.logger.promptContinueDeployment();

      try {
        await this.txExecutor.execute(
          moduleName,
          initializedTxModuleState,
          this.repos.registry,
          this.repos.resolver,
          module.getModuleConfig()
        );
      } catch (error) {
        await this.txExecutor.executeModuleEvents(
          moduleName,
          moduleState,
          module.getAllModuleEvents().onFail
        );

        throw error;
      }

      const summary = await this.moduleDeploymentSummaryService.showSummary(
        moduleName,
        stateFileRegistry
      );
      this.logger.finishModuleDeploy(moduleName, summary);
    } catch (err) {
      await errorHandling(err, this.logger, this.errorReporter);

      throw err;
    }
  }

  async diff(networkName: string, module: Module, logging?: boolean) {
    try {
      if (!this._initialized) {
        await this.mustInit(this.params, this.customServices, this.repos);
      }

      if (this.params.logging != logging) {
        await this.reInitLogger(!!logging);
      }

      if (!this.moduleStateRepo || !this.moduleResolver) {
        throw new ServicesNotInitialized();
      }
      const signers = this.signers || [];
      const ignitionWallets = this.walletWrapper?.wrapSigners(signers) || [];
      const moduleName = module.name;
      if (module.isInitialized()) {
        return;
      }

      const moduleSession = cls.createNamespace('module');
      await moduleSession.runAndReturn(async () => {
        await module.init(
          moduleSession,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          {
            params: this.moduleParams || {},
          }
        );
      });
      this.moduleStateRepo.initStateRepo(moduleName);

      const stateFileRegistry = await this.moduleStateRepo.getStateIfExist(
        moduleName
      );

      const moduleState: ModuleState | null = await this.moduleResolver.resolve(
        module.getAllBindings(),
        module.getAllEvents(),
        module.getAllModuleEvents(),
        stateFileRegistry
      );
      if (!checkIfExist(moduleState)) {
        return;
      }

      // @TODO migrate this to be an object
      if (this.moduleResolver.checkIfDiff(stateFileRegistry, moduleState)) {
        cli.info(`\nModule: ${moduleName}`);
        this.moduleResolver.printDiffParams(stateFileRegistry, moduleState);
      } else {
        cli.info(`Nothing changed from last revision - ${moduleName}`);
      }
    } catch (err) {
      await errorHandling(err, this.logger, this.errorReporter);
    }
  }

  async genTypes(module: Module, deploymentFolder: string) {
    try {
      if (!this._initialized) {
        await this.mustInit(this.params, this.customServices, this.repos);
      }

      if (!this.moduleTyping || !this.logger) {
        throw new ServicesNotInitialized();
      }

      const signers = this.signers || [];
      const ignitionWallets = this.walletWrapper?.wrapSigners(signers) || [];

      const moduleSession = cls.createNamespace('module');
      await moduleSession.runAndReturn(async () => {
        await module.init(
          moduleSession,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          this.moduleParams
        );
      });

      this.moduleTyping.generate(deploymentFolder, module.name, module);

      this.logger.generatedTypes();
    } catch (err) {
      await errorHandling(err, this.logger, this.errorReporter);
    }
  }

  async reInitLogger(logging: boolean): Promise<void> {
    this.params.logging = logging;
    await this.mustInit(this.params, this.customServices, this.repos);
  }
}

export async function defaultInputParams(
  params: IgnitionParams,
  services?: IgnitionServices,
  repos?: IgnitionRepos
): Promise<{
  networkName: string;
  networkId: string;
  gasPriceBackoff: GasPriceBackoff | undefined;
  rpcProvider: ethers.providers.JsonRpcProvider;
  logger: ILogging;
  parallelizeDeployment: boolean;
  errorReporter: IErrorReporting;
  signers: Array<ethers.Signer>;
  isLocalDeployment: boolean;
}> {
  const globalConfigService = new GlobalConfigService();
  await globalConfigService.mustConfirmConsent();
  const errorReporter = new ErrorReporter(globalConfigService);

  let networkName = params?.networkName || DEFAULT_NETWORK_NAME;

  let isLocalDeployment = true;
  let parallelizeDeployment = params?.parallelizeDeployment || false;
  let gasPriceBackoff: GasPriceBackoff | undefined;
  if (!checkIfExist(networkName)) {
    networkName = DEFAULT_NETWORK_NAME;
  }

  let networkId: string = DEFAULT_NETWORK_ID;
  if (params?.networkId) {
    networkId = params?.networkId as string;
  }
  if (!checkIfExist(networkId)) {
    networkId = DEFAULT_NETWORK_ID;
  }
  process.env.IGNITION_NETWORK_ID = String(networkId);
  let provider = new ethers.providers.JsonRpcProvider();
  process.env.IGNITION_RPC_PROVIDER = DEFAULT_RPC_PROVIDER;
  if (params?.rpcProvider) {
    provider = params.rpcProvider;
    process.env.IGNITION_RPC_PROVIDER = String(params?.rpcProvider);
  }

  if (params?.blockConfirmation) {
    process.env.BLOCK_CONFIRMATION_NUMBER = String(params.blockConfirmation);
  }

  if (params?.localDeployment) {
    isLocalDeployment = params?.localDeployment || true;
  }

  if (params?.gasPriceBackoffMechanism) {
    gasPriceBackoff = params?.gasPriceBackoffMechanism as GasPriceBackoff;
  }

  if (params?.parallelizeDeployment) {
    parallelizeDeployment = true;
  }

  let logger: OverviewLogger | EmptyLogger;
  if (params?.logging) {
    logger = new OverviewLogger();
  } else {
    logger = new EmptyLogger();
  }

  const signers: ethers.Signer[] = params?.signers || [];
  if (signers.length == 0) {
    throw new EmptySigners();
  }

  return {
    networkName,
    networkId,
    rpcProvider: provider,
    gasPriceBackoff,
    logger,
    parallelizeDeployment,
    errorReporter,
    signers,
    isLocalDeployment,
  };
}

export async function setupServicesAndEnvironment(
  params: IgnitionParams,
  services?: IgnitionServices,
  repos?: IgnitionRepos
): Promise<any> {
  const {
    networkName,
    networkId,
    gasPriceBackoff,
    rpcProvider,
    logger,
    errorReporter,
    signers,
  } = await defaultInputParams(params, services, repos);
  const currentPath = process.cwd();

  const gasProvider = new GasPriceCalculator(rpcProvider);
  const eventSession = cls.createNamespace('event');

  const moduleStateRepo = new ModuleStateRepo(
    networkName,
    currentPath,
    false,
    params?.test || false
  );
  const eventTxExecutor = new EventTxExecutor(eventSession, moduleStateRepo);

  process.env.IGNITION_NETWORK_ID = String(networkId);
  if (signers.length == 0) {
    throw new EmptySigners();
  }

  const signer = signers[0];
  const transactionManager = new TransactionManager(
    rpcProvider,
    signer,
    networkId,
    gasProvider,
    gasProvider,
    logger,
    gasPriceBackoff
  );
  const txGenerator = new EthTxGenerator(
    signer,
    gasProvider,
    gasProvider,
    networkId,
    rpcProvider,
    transactionManager,
    transactionManager,
    logger,
    gasPriceBackoff
  );

  const eventHandler = new EventHandler(moduleStateRepo, logger);
  const txExecutor = new TxExecutor(
    logger,
    moduleStateRepo,
    txGenerator,
    networkId,
    rpcProvider,
    eventHandler,
    eventSession,
    eventTxExecutor
  );

  const ethClient = new EthClient(rpcProvider);
  const moduleResolver = new ModuleResolver(
    rpcProvider,
    signer,
    logger,
    txGenerator,
    moduleStateRepo,
    eventTxExecutor,
    eventSession,
    ethClient
  );

  const walletWrapper = new WalletWrapper(
    eventSession,
    transactionManager,
    gasProvider,
    gasProvider,
    moduleStateRepo,
    logger,
    eventTxExecutor
  );
  const moduleTyping = new ModuleTypings();

  const moduleDeploymentSummaryService = new ModuleDeploymentSummaryService(
    moduleStateRepo
  );

  return {
    networkName,
    networkId,
    gasPriceBackoff,
    rpcProvider,
    signers,
    logger,

    gasProvider,
    eventSession,
    moduleStateRepo,
    moduleResolver,
    txGenerator,
    txExecutor,
    walletWrapper,
    moduleDeploymentSummaryService,

    errorReporter,
    moduleTyping,
  };
}
