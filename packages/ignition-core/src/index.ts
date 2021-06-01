import { cli } from "cli-ux";
import * as cls from "cls-hooked";
import { ethers } from "ethers";

import { Module, ModuleParams } from "./interfaces/hardhat_ignition";
import { GlobalConfigService } from "./services/config";
import { EthClient } from "./services/ethereum/client";
import { ICompiler } from "./services/ethereum/compiler";
import { HardhatCompiler } from "./services/ethereum/compiler/hardhat";
import { IGasProvider } from "./services/ethereum/gas";
import { GasPriceCalculator } from "./services/ethereum/gas/calculator";
import {
  INonceManager,
  ITransactionSigner,
} from "./services/ethereum/transactions";
import { EventTxExecutor } from "./services/ethereum/transactions/event_executor";
import { TxExecutor } from "./services/ethereum/transactions/executor";
import { EthTxGenerator } from "./services/ethereum/transactions/generator";
import { TransactionManager } from "./services/ethereum/transactions/manager";
import { WalletWrapper } from "./services/ethereum/wallet/wrapper";
import { EventHandler } from "./services/modules/events/handler";
import { ModuleDeploymentSummaryService } from "./services/modules/module_deployment_summary";
import { ModuleResolver } from "./services/modules/module_resolver";
import { FileSystemModuleState } from "./services/modules/states/module/file_system";
import { MemoryModuleState } from "./services/modules/states/module/memory";
import { IModuleRegistryResolver } from "./services/modules/states/registry";
import { ModuleStateRepo } from "./services/modules/states/repo/state_repo";
import { ModuleTypings } from "./services/modules/typings";
import { IModuleValidator } from "./services/modules/validator";
import { ModuleValidator } from "./services/modules/validator/module_validator";
import { GasPriceBackoff } from "./services/types/config";
import { EmptySigners, ServicesNotInitialized } from "./services/types/errors";
import { ModuleState } from "./services/types/module";
import { IErrorReporting } from "./services/utils/analytics";
import { ErrorReporter } from "./services/utils/analytics/analytics_service";
import {
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
  DEFAULT_RPC_PROVIDER,
} from "./services/utils/constants";
import { ILogging } from "./services/utils/logging";
import { EmptyLogger } from "./services/utils/logging/empty_logging";
import { OverviewLogger } from "./services/utils/logging/react-terminal";
import { checkIfExist, errorHandling } from "./services/utils/util";

export * from "./interfaces/hardhat_ignition";
export * from "./interfaces/module_builders";
export * from "./interfaces/helper/expectancy";
export * from "./interfaces/helper/macros";

export * from "./services/config";
export * from "./services/types";
export * from "./services/ethereum/compiler";
export * from "./services/ethereum/compiler/hardhat";
export * from "./services/ethereum/transactions";
export * from "./services/ethereum/transactions/manager";
export * from "./services/ethereum/wallet/wrapper";
export * from "./services/modules/states/module";
export * from "./services/modules/states/registry";
export * from "./services/modules/states/registry/remote_bucket_storage";
export * from "./services/modules/typings";
export * from "./services/utils/util";
export * from "./services/ethereum/gas";
export * from "./services/ethereum/gas/calculator";
export * from "./services/ethereum/transactions/generator";
export * from "./services/ethereum/transactions/executor";
export * from "./services/ethereum/transactions/event_executor";
export * from "./services/modules/states/repo";
export * from "./services/modules/module_resolver";
export * from "./services/modules/events/handler";
export * from "./services/utils/logging";
export * from "./services/types/migration";
export * from "./services/modules/states/state_migration_service";
export * from "./services/tutorial/tutorial_service";
export * from "./services/tutorial/system_crawler";
export * from "./services/tutorial/deployment_file_gen";
export * from "./services/tutorial/deployment_file_repo";
export * from "./services/modules/module_migration";
export * from "./services/ethereum/client";
export * from "./services/modules/module_usage";
export * from "./services/modules/module_deployment_summary";
export * from "./services/config";
export * from "./services/types";
export * from "./services/types/config";
export * from "./services/utils/analytics";
export * from "./services/types/module";

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

export interface IgnitionParams {
  networkName: string;
  networkId: string;
  rpcProvider?: ethers.providers.JsonRpcProvider;
  signers?: ethers.Signer[];
  logging?: boolean;
  parallelizeDeployment?: boolean;
  localDeployment?: boolean;
  blockConfirmation?: number;
  gasPriceBackoffMechanism?: GasPriceBackoff;
  test?: boolean;
}

export interface IgnitionServices {
  gasPriceProvider?: IGasProvider;
  nonceManager?: INonceManager;
  transactionSigner?: ITransactionSigner;
}

export interface IgnitionRepos {
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
}

export class IgnitionCore implements IIgnition {
  public params: IgnitionParams;
  public customServices: IgnitionServices;
  public repos: IgnitionRepos;
  public moduleParams: ModuleParams;
  public moduleStateRepo: ModuleStateRepo | undefined;

  private _initialized: boolean = false;
  private _networkName: string | undefined;
  private _networkId: string | undefined;
  private _gasPriceBackoff: GasPriceBackoff | undefined;
  private _rpcProvider: ethers.providers.JsonRpcProvider | undefined;
  private _signers: ethers.Signer[] | undefined;
  private _logger: ILogging | undefined;

  private _gasProvider: IGasProvider | undefined;
  private _eventSession: cls.Namespace | undefined;
  private _moduleResolver: ModuleResolver | undefined;
  private _txGenerator: EthTxGenerator | undefined;
  private _txExecutor: TxExecutor | undefined;
  private _walletWrapper: WalletWrapper | undefined;
  private _moduleDeploymentSummaryService:
    | ModuleDeploymentSummaryService
    | undefined;

  private _errorReporter: IErrorReporting | undefined;
  private _moduleTyping: ModuleTypings | undefined;
  private readonly _compiler: ICompiler;
  private readonly _moduleValidator: IModuleValidator;

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

    // @TODO move to mustInit eventually
    this._compiler = new HardhatCompiler();
    this._moduleValidator = new ModuleValidator();
  }

  public async mustInit(
    params?: IgnitionParams,
    services?: IgnitionServices,
    repos?: IgnitionRepos,
    moduleParams?: ModuleParams
  ) {
    if (params !== undefined) {
      this.params = params;
    }
    if (services !== undefined) {
      this.customServices = services;
    }
    if (repos !== undefined) {
      this.repos = repos;
    }
    if (moduleParams !== undefined) {
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

    this._networkName = this.params.networkName;
    this._networkId = networkId;
    this._gasPriceBackoff = gasPriceBackoff;
    this._rpcProvider = rpcProvider;
    this._signers = signers;
    this._logger = logger;

    this._gasProvider = gasProvider;
    this._eventSession = eventSession;
    this.moduleStateRepo = moduleStateRepo;
    this._moduleResolver = moduleResolver;
    this._txGenerator = txGenerator;
    this._txExecutor = txExecutor;
    this._walletWrapper = walletWrapper;
    this._moduleDeploymentSummaryService = moduleDeploymentSummaryService;

    this._errorReporter = errorReporter;
    this._moduleTyping = moduleTyping;

    this._initialized = true;
  }

  public async deploy(
    networkName: string,
    module: Module,
    logging?: boolean,
    test?: boolean
  ) {
    try {
      if (!this._initialized) {
        await this.mustInit(this.params, this.customServices, this.repos);
      }

      if (this.params.logging !== logging) {
        await this.reInitLogger(logging !== undefined);
      }

      if (
        this.moduleStateRepo === undefined ||
        this._logger === undefined ||
        this._txGenerator === undefined ||
        this._moduleResolver === undefined ||
        this._txExecutor === undefined ||
        this._moduleDeploymentSummaryService === undefined
      ) {
        throw new ServicesNotInitialized();
      }

      // wrapping ether.Wallet in order to support state file storage
      const signers = this._signers ?? [];
      const ignitionWallets = this._walletWrapper?.wrapSigners(signers);

      const moduleName = module.name;

      // If a module is initialized it means it is sub module inside the bigger one. Only modules that are not initialized
      // can be executed.
      if (module.isInitialized()) {
        return;
      }

      // ability to surface module's context when using subModule functionality
      const moduleSession = cls.createNamespace("module");
      await moduleSession.runAndReturn(async () => {
        await module.init(
          moduleSession,
          this._compiler,
          this._moduleValidator,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          {
            params: this.moduleParams ?? {},
          }
        );
      });
      this.moduleStateRepo.initStateRepo(moduleName);

      // merging state file with provided states files
      const stateFileRegistry = await this.moduleStateRepo.getStateIfExist(
        moduleName
      );

      this._logger.startModuleResolving(moduleName);
      // resolving contract and events dependencies and determining execution order
      const moduleState: ModuleState | null = await this._moduleResolver.resolve(
        module.getAllBindings(),
        module.getAllEvents(),
        module.getAllModuleEvents(),
        stateFileRegistry
      );
      this._logger.finishModuleResolving(moduleName);

      // setting up custom functionality
      if (
        module.getCustomGasPriceProvider() !== undefined &&
        this.customServices.gasPriceProvider !== undefined
      ) {
        this._txGenerator.changeGasPriceCalculator(
          this.customServices.gasPriceProvider
        );
      }

      if (
        module.getCustomNonceManager() !== undefined &&
        this.customServices.nonceManager !== undefined
      ) {
        this._txGenerator.changeNonceManager(this.customServices.nonceManager);
      }

      if (
        module.getCustomTransactionSigner() !== undefined &&
        this.customServices.transactionSigner !== undefined
      ) {
        this._txGenerator.changeTransactionSigner(
          this.customServices.transactionSigner
        );
      }

      const initializedTxModuleState = await this._txGenerator.initTx(
        moduleState
      );
      await this._logger.promptContinueDeployment();

      try {
        await this._txExecutor.execute(
          moduleName,
          initializedTxModuleState,
          this.repos.registry,
          this.repos.resolver,
          module.getModuleConfig()
        );
      } catch (error) {
        await this._txExecutor.executeModuleEvents(
          moduleName,
          moduleState,
          module.getAllModuleEvents().onFail
        );

        throw error;
      }

      const summary = await this._moduleDeploymentSummaryService.showSummary(
        moduleName,
        stateFileRegistry
      );
      this._logger.finishModuleDeploy(moduleName, summary);
    } catch (err) {
      await errorHandling(err, this._logger, this._errorReporter);

      throw err;
    }
  }

  public async diff(networkName: string, module: Module, logging?: boolean) {
    try {
      if (!this._initialized) {
        await this.mustInit(this.params, this.customServices, this.repos);
      }

      if (this.params.logging !== logging) {
        await this.reInitLogger(logging !== undefined);
      }

      if (
        this.moduleStateRepo === undefined ||
        this._moduleResolver === undefined
      ) {
        throw new ServicesNotInitialized();
      }
      const signers = this._signers ?? [];
      const ignitionWallets = this._walletWrapper?.wrapSigners(signers) ?? [];
      const moduleName = module.name;
      if (module.isInitialized()) {
        return;
      }

      const moduleSession = cls.createNamespace("module");
      await moduleSession.runAndReturn(async () => {
        await module.init(
          moduleSession,
          this._compiler,
          this._moduleValidator,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          {
            params: this.moduleParams ?? {},
          }
        );
      });
      this.moduleStateRepo.initStateRepo(moduleName);

      const stateFileRegistry = await this.moduleStateRepo.getStateIfExist(
        moduleName
      );

      const moduleState: ModuleState | null = await this._moduleResolver.resolve(
        module.getAllBindings(),
        module.getAllEvents(),
        module.getAllModuleEvents(),
        stateFileRegistry
      );
      if (!checkIfExist(moduleState)) {
        return;
      }

      // @TODO migrate this to be an object
      if (this._moduleResolver.checkIfDiff(stateFileRegistry, moduleState)) {
        cli.info(`\nModule: ${moduleName}`);
        this._moduleResolver.printDiffParams(stateFileRegistry, moduleState);
      } else {
        cli.info(`Nothing changed from last revision - ${moduleName}`);
      }
    } catch (err) {
      await errorHandling(err, this._logger, this._errorReporter);
    }
  }

  public async genTypes(module: Module, deploymentFolder: string) {
    try {
      if (!this._initialized) {
        await this.mustInit(this.params, this.customServices, this.repos);
      }

      if (this._moduleTyping === undefined || this._logger === undefined) {
        throw new ServicesNotInitialized();
      }

      const signers = this._signers ?? [];
      const ignitionWallets = this._walletWrapper?.wrapSigners(signers) ?? [];

      const moduleSession = cls.createNamespace("module");
      await moduleSession.runAndReturn(async () => {
        await module.init(
          moduleSession,
          this._compiler,
          this._moduleValidator,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          this.moduleParams
        );
      });

      this._moduleTyping.generate(deploymentFolder, module.name, module);

      this._logger.generatedTypes();
    } catch (err) {
      await errorHandling(err, this._logger, this._errorReporter);
    }
  }

  public async reInitLogger(logging: boolean): Promise<void> {
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
  signers: ethers.Signer[];
  isLocalDeployment: boolean;
}> {
  const globalConfigService = new GlobalConfigService();
  await globalConfigService.mustConfirmConsent();
  const errorReporter = new ErrorReporter(globalConfigService);

  let networkName = params?.networkName ?? DEFAULT_NETWORK_NAME;

  let isLocalDeployment = true;
  let parallelizeDeployment = params?.parallelizeDeployment ?? false;
  let gasPriceBackoff: GasPriceBackoff | undefined;
  if (!checkIfExist(networkName)) {
    networkName = DEFAULT_NETWORK_NAME;
  }

  let networkId: string = DEFAULT_NETWORK_ID;
  if (params?.networkId !== undefined) {
    networkId = params?.networkId as string;
  }
  if (!checkIfExist(networkId)) {
    networkId = DEFAULT_NETWORK_ID;
  }
  process.env.IGNITION_NETWORK_ID = String(networkId);
  let provider = new ethers.providers.JsonRpcProvider();
  process.env.IGNITION_RPC_PROVIDER = DEFAULT_RPC_PROVIDER;
  if (params?.rpcProvider !== undefined) {
    provider = params.rpcProvider;
    process.env.IGNITION_RPC_PROVIDER = String(params?.rpcProvider);
  }

  if (params?.blockConfirmation !== undefined) {
    process.env.BLOCK_CONFIRMATION_NUMBER = String(params.blockConfirmation);
  }

  if (params?.localDeployment !== undefined) {
    isLocalDeployment = params?.localDeployment ?? true;
  }

  if (params?.gasPriceBackoffMechanism !== undefined) {
    gasPriceBackoff = params?.gasPriceBackoffMechanism as GasPriceBackoff;
  }

  if (params?.parallelizeDeployment !== undefined) {
    parallelizeDeployment = true;
  }

  let logger: OverviewLogger | EmptyLogger;
  if (params?.logging !== undefined) {
    logger = new OverviewLogger();
  } else {
    logger = new EmptyLogger();
  }

  const signers: ethers.Signer[] = params?.signers ?? [];
  if (signers.length === 0) {
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
  const eventSession = cls.createNamespace("event");

  const testEnv = params?.test ?? false;
  const moduleStateRepo = new ModuleStateRepo(
    networkName,
    currentPath,
    false,
    testEnv ? new MemoryModuleState() : new FileSystemModuleState(currentPath),
    testEnv
  );
  const eventTxExecutor = new EventTxExecutor(eventSession, moduleStateRepo);

  process.env.IGNITION_NETWORK_ID = String(networkId);
  if (signers.length === 0) {
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