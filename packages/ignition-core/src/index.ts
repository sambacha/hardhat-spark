import { cli } from "cli-ux";
import { Namespace } from "cls-hooked";
import * as cls from "cls-hooked";
import { ethers } from "ethers";

import { Module, ModuleParams } from "./interfaces/hardhat-ignition";
import { EthClient } from "./services/ethereum/client";
import { IContractDataExtractor } from "./services/ethereum/extractor";
import { HardhatExtractor } from "./services/ethereum/extractor/hardhat";
import { IGasProvider } from "./services/ethereum/gas";
import { GasPriceCalculator } from "./services/ethereum/gas/calculator";
import {
  INonceManager,
  ITransactionSigner,
} from "./services/ethereum/transactions";
import { EventTxExecutor } from "./services/ethereum/transactions/event-executor";
import { TxExecutor } from "./services/ethereum/transactions/executor";
import { EthTxGenerator } from "./services/ethereum/transactions/generator";
import { TransactionManager } from "./services/ethereum/transactions/manager";
import { WalletWrapper } from "./services/ethereum/wallet/wrapper";
import { EventHandler } from "./services/modules/events/handler";
import { ModuleDeploymentSummaryService } from "./services/modules/module-deployment-summary";
import { ModuleResolver } from "./services/modules/module-resolver";
import { FileSystemModuleState } from "./services/modules/states/module/file-system";
import { MemoryModuleState } from "./services/modules/states/module/memory";
import { ModuleStateRepo } from "./services/modules/states/repo/state-repo";
import { ModuleTypings } from "./services/modules/typings";
import { IModuleValidator } from "./services/modules/validator";
import { ModuleValidator } from "./services/modules/validator/module-validator";
import {
  EmptySigners,
  GasPriceBackoff,
  ServicesNotInitialized,
} from "./services/types";
import { ModuleState } from "./services/types/module";
import {
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
} from "./services/utils/constants";
import { ClsNamespaces } from "./services/utils/continuation-local-storage";
import { ILogging } from "./services/utils/logging";
import { EmptyLogger } from "./services/utils/logging/empty-logging";
import { OverviewLogger } from "./services/utils/logging/react-terminal";
import { checkIfExist, errorHandling } from "./services/utils/util";

export * from "./interfaces/hardhat-ignition";
export * from "./interfaces/module-builders";
export * from "./interfaces/helper/expectancy";
export * from "./interfaces/helper/macros";

export * from "./services/types";
export * from "./services/ethereum/extractor";
export * from "./services/ethereum/extractor/hardhat";
export * from "./services/ethereum/transactions";
export * from "./services/ethereum/transactions/manager";
export * from "./services/ethereum/wallet/wrapper";
export * from "./services/modules/states/module";
export * from "./services/modules/typings";
export * from "./services/utils/util";
export * from "./services/ethereum/gas";
export * from "./services/ethereum/gas/calculator";
export * from "./services/ethereum/transactions/generator";
export * from "./services/ethereum/transactions/executor";
export * from "./services/ethereum/transactions/event-executor";
export * from "./services/modules/states/repo";
export * from "./services/modules/module-resolver";
export * from "./services/modules/events/handler";
export * from "./services/utils/logging";
export * from "./services/types/migration";
export * from "./services/modules/states/state-migration-service";
export * from "./services/utils/searcher";
export * from "./services/ethereum/client";
export * from "./services/modules/module-usage";
export * from "./services/modules/module-deployment-summary";
export * from "./services/types";
export * from "./services/types/config";
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

export interface IgnitionParams {
  networkName: string;
  networkId: string;
  rpcProvider: ethers.providers.JsonRpcProvider;
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

export class IgnitionCore {
  public moduleParams: ModuleParams;

  public readonly params: IgnitionParams;
  public readonly customServices: IgnitionServices;
  public readonly moduleStateRepo: ModuleStateRepo;

  private readonly _networkName: string;
  private readonly _networkId: string;
  private readonly _gasPriceBackoff: GasPriceBackoff;
  private readonly _rpcProvider: ethers.providers.JsonRpcProvider;
  private readonly _signers: ethers.Signer[];
  private _logger: ILogging;

  private readonly _gasProvider: IGasProvider;
  private readonly _eventSession: cls.Namespace;
  private readonly _moduleResolver: ModuleResolver;
  private readonly _txGenerator: EthTxGenerator;
  private readonly _txExecutor: TxExecutor;
  private readonly _walletWrapper: WalletWrapper;
  private readonly _moduleDeploymentSummaryService: ModuleDeploymentSummaryService;

  private readonly _moduleTyping: ModuleTypings;
  private readonly _extractor: IContractDataExtractor;
  private readonly _moduleValidator: IModuleValidator;

  constructor(
    params: IgnitionParams,
    services: IgnitionServices,
    moduleParams: ModuleParams = {}
  ) {
    this.params = params;
    this.customServices = services;
    this.moduleParams = moduleParams;

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

      moduleTyping,
    } = setupServicesAndEnvironment(this.params);

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

    this._moduleTyping = moduleTyping;
    this._extractor = new HardhatExtractor();
    this._moduleValidator = new ModuleValidator();
  }

  public async deploy(networkName: string, module: Module, logging?: boolean) {
    try {
      if (logging !== undefined && this.params.logging !== logging) {
        await this.reInitLogger(logging);
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
          this._extractor,
          this._moduleValidator,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          this.moduleParams ?? {}
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
      await errorHandling(err, this._logger);

      throw err;
    }
  }

  public async diff(networkName: string, module: Module, logging?: boolean) {
    try {
      if (logging !== undefined && this.params.logging !== logging) {
        await this.reInitLogger(logging !== undefined);
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
          this._extractor,
          this._moduleValidator,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          this.moduleParams ?? {}
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
      await errorHandling(err, this._logger);

      throw err;
    }
  }

  public async genTypes(module: Module, deploymentFolder: string) {
    try {
      if (this._moduleTyping === undefined || this._logger === undefined) {
        throw new ServicesNotInitialized();
      }

      const signers = this._signers ?? [];
      const ignitionWallets = this._walletWrapper?.wrapSigners(signers) ?? [];

      const moduleSession = cls.createNamespace("module");
      await moduleSession.runAndReturn(async () => {
        await module.init(
          moduleSession,
          this._extractor,
          this._moduleValidator,
          (ignitionWallets as unknown) as ethers.Signer[],
          undefined,
          this.moduleParams
        );
      });

      this._moduleTyping.generate(deploymentFolder, module.name, module);

      this._logger.generatedTypes();
    } catch (err) {
      await errorHandling(err, this._logger);
    }
  }

  public async reInitLogger(logging: boolean): Promise<void> {
    this.params.logging = logging;
    // @TODO make it possible to change logging
  }
}

export function defaultInputParams(
  eventSession: Namespace,
  params: IgnitionParams
): {
  networkName: string;
  networkId: string;
  gasPriceBackoff: GasPriceBackoff | undefined;
  rpcProvider: ethers.providers.JsonRpcProvider;
  logger: ILogging;
  parallelizeDeployment: boolean;
  signers: ethers.Signer[];
  isLocalDeployment: boolean;
} {
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
  eventSession.set(ClsNamespaces.IGNITION_NETWORK_ID, networkId);
  const provider = params.rpcProvider;
  eventSession.set(ClsNamespaces.IGNITION_RPC_PROVIDER, provider);
  eventSession.set(
    ClsNamespaces.BLOCK_CONFIRMATION_NUMBER,
    params?.blockConfirmation ?? 1
  );

  if (params?.localDeployment !== undefined) {
    isLocalDeployment = params?.localDeployment ?? true;
  }

  if (params?.gasPriceBackoffMechanism !== undefined) {
    gasPriceBackoff = params?.gasPriceBackoffMechanism as GasPriceBackoff;
  }

  if (params?.parallelizeDeployment !== undefined) {
    parallelizeDeployment = true;
  }

  let logger: ILogging;
  if (params?.logging === undefined || params.logging) {
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
    signers,
    isLocalDeployment,
  };
}

export function setupServicesAndEnvironment(params: IgnitionParams): any {
  const eventSession = cls.createNamespace("event");
  return eventSession.runAndReturn(() => {
    const {
      networkName,
      networkId,
      gasPriceBackoff,
      rpcProvider,
      logger,
      signers,
    } = defaultInputParams(eventSession, params);
    const currentPath = process.cwd();

    const gasProvider = new GasPriceCalculator(rpcProvider);

    const testEnv = params?.test ?? false;
    const moduleStateRepo = new ModuleStateRepo(
      networkName,
      currentPath,
      false,
      testEnv
        ? new MemoryModuleState()
        : new FileSystemModuleState(currentPath),
      testEnv
    );
    const eventTxExecutor = new EventTxExecutor(eventSession, moduleStateRepo);

    eventSession.set(ClsNamespaces.IGNITION_NETWORK_ID, networkId);
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

      moduleTyping,
    };
  });
}
