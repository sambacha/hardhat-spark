import { Wallet } from 'ethers';
import * as cls from 'cls-hooked';
import '../services/hardhat_plugin/type_extentions';
import * as path from 'path';

import {
  IgnitionCore,

  GasPriceCalculator,
  TransactionManager,
  EthTxGenerator,
  ModuleStateRepo,
  EventTxExecutor,
  ModuleResolver,
  EventHandler,
  TxExecutor,
  WalletWrapper,
  Logging,
  Migration,
  defaultInputParams,
  ModuleTypings,
  StateMigrationService,
  TutorialService,
  SystemCrawlingService,
  DeploymentFileGenerator,
  DeploymentFileRepo,
  FileSystemModuleState,
  ModuleMigrationService,
  EthClient,
  ModuleUsage,
  ModuleDeploymentSummaryService, IIgnition,
} from 'ignition-core';

export interface TutorialArgs {
}

export interface DiffArgs {
  moduleFilePath?: string;
  networkName?: string;
  state?: string;
  configScriptPath?: string;
}

export interface DeployArgs {
  moduleFilePath?: string;
  networkName?: string;
  rpcProvider?: string;
  parallelize?: boolean;
  logging?: Logging;
  state?: string;
  configScriptPath?: string;
  testEnv?: boolean;
}

export interface GenTypesArgs {
  moduleFilePath?: string;
  configScriptPath?: string;
}

export interface MigrationArgs {
  from?: string;
  moduleName: string;
}

export interface UsageArgs {
  moduleFilePath?: string;
  networkName?: string;
  testEnv?: boolean;
  state?: string;
  configScriptPath?: string;
}

export type Args = DeployArgs | DiffArgs | GenTypesArgs | MigrationArgs | TutorialArgs | UsageArgs;

export class IgnitionHardhatActions {
  static async deploy(args: DeployArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition();

    await ignitionHardhat.deploy(args);
  }

  static async diff(args: DiffArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition();

    await ignitionHardhat.diff(args);
  }

  static async genTypes(args: GenTypesArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition();

    await ignitionHardhat.genTypes(args);
  }

  static async migration(args: MigrationArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition();

    await ignitionHardhat.migration(args);
  }

  static async tutorial(args: TutorialArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition();

    await ignitionHardhat.tutorial(args);
  }

  static async usage(args: UsageArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition();

    await ignitionHardhat.usage(args);
  }
}

export class HardhatIgnition implements IIgnition {
  private readonly ignitionCore: IgnitionCore;
  constructor() {
    this.ignitionCore = new IgnitionCore();
  }

  async deploy(args: DeployArgs): Promise<void> {
    const {
      deploymentPath,
      config,
      states,
      moduleStateRepo,
      moduleResolver,
      txGenerator,
      prompter,
      txExecutor,
      configService,
      walletWrapper,
      moduleDeploymentSummaryService,
      analyticsService
    } = await HardhatIgnition.setupServicesAndEnvironment(args.moduleFilePath, args.networkName, args.state, args.rpcProvider, args.logging, args.configScriptPath);

    await this.ignitionCore.deploy(
      deploymentPath,
      config,
      states,
      moduleStateRepo,
      moduleResolver,
      txGenerator,
      prompter,
      txExecutor,
      configService,
      walletWrapper,
      moduleDeploymentSummaryService,
      analyticsService
    );
  }

  async diff(args: DiffArgs): Promise<void> {
    const {
      deploymentPath,
      config,
      states,
      moduleResolver,
      moduleStateRepo,
      configService,
      analyticsService,
    } = await HardhatIgnition.setupServicesAndEnvironment(args.moduleFilePath, args.networkName, args.state, undefined, undefined, args.configScriptPath);

    await this.ignitionCore.diff(
      deploymentPath,
      config,
      states,
      moduleResolver,
      moduleStateRepo,
      configService,
      analyticsService,
    );
  }

  async genTypes(args: GenTypesArgs): Promise<void> {
    const {
      deploymentPath,
      config,
      moduleTyping,
      configService,
      prompter,
      analyticsService,
    } = await HardhatIgnition.setupServicesAndEnvironment(args.moduleFilePath, undefined, undefined, undefined, undefined, args.configScriptPath);

    await this.ignitionCore.genTypes(
      deploymentPath,
      config,
      moduleTyping,
      configService,
      prompter,
      analyticsService,
    );
  }

  async migration(args: MigrationArgs): Promise<void> {
    const {
      stateMigrationService,
      moduleMigrationService,
      analyticsService,
    } = await HardhatIgnition.setupServicesAndEnvironment(undefined, undefined, undefined, undefined, undefined, undefined, args.from);

    await this.ignitionCore.migrate(
      stateMigrationService,
      moduleMigrationService,
      args.moduleName,
      analyticsService,
    );
  }

  async tutorial(args: TutorialArgs): Promise<void> {
    const {
      tutorialService,
      analyticsService,
    } = await HardhatIgnition.setupServicesAndEnvironment();

    await this.ignitionCore.tutorial(
      tutorialService,
      analyticsService,
    );
  }

  async usage(args: UsageArgs): Promise<void> {
    const {
      config,
      deploymentPath,
      configService,
      walletWrapper,
      moduleStateRepo,
      moduleUsage,
      prompter,
      analyticsService,
    } = await HardhatIgnition.setupServicesAndEnvironment(args.moduleFilePath, args.networkName, args.state, undefined, undefined, args.configScriptPath);

    await this.ignitionCore.usage(
      config,
      deploymentPath,
      (args.state || '').split(','),
      configService,
      walletWrapper,
      moduleStateRepo,
      moduleUsage,
      prompter,
      analyticsService,
    );
  }

  private static async setupServicesAndEnvironment(moduleFilePath?: string, network?: string, state?: string, provider?: string, logging?: Logging, configScriptPath?: string, from?: string): Promise<any> {
    const {
      networkName,
      networkId,
      gasPriceBackoff,
      rpcProvider,
      filePath,
      states,
      logger,
      config,
      configService,
      analyticsService,
    } = await defaultInputParams(moduleFilePath, network, state, provider, logging, configScriptPath);

    const currentPath = process.cwd();
    const deploymentPath = path.resolve(currentPath, filePath);

    const gasProvider = new GasPriceCalculator(rpcProvider);
    const eventSession = cls.createNamespace('event');

    const moduleStateRepo = new ModuleStateRepo(networkName, currentPath, false);
    const eventTxExecutor = new EventTxExecutor(eventSession, moduleStateRepo);

    process.env.IGNITION_NETWORK_ID = String(networkId);

    const transactionManager = new TransactionManager(rpcProvider, new Wallet(configService.getFirstPrivateKey(), rpcProvider), networkId, gasProvider, gasProvider, logger, gasPriceBackoff);
    const txGenerator = new EthTxGenerator(configService, gasProvider, gasProvider, networkId, rpcProvider, transactionManager, transactionManager, logger, gasPriceBackoff);

    const eventHandler = new EventHandler(moduleStateRepo, logger);
    const txExecutor = new TxExecutor(logger, moduleStateRepo, txGenerator, networkId, rpcProvider, eventHandler, eventSession, eventTxExecutor);

    const ethClient = new EthClient(rpcProvider);
    const moduleResolver = new ModuleResolver(rpcProvider, configService.getFirstPrivateKey(), logger, txGenerator, moduleStateRepo, eventTxExecutor, eventSession, ethClient);

    const walletWrapper = new WalletWrapper(eventSession, transactionManager, gasProvider, gasProvider, moduleStateRepo, logger, eventTxExecutor);
    const moduleTyping = new ModuleTypings();

    const deploymentFileRepo = new DeploymentFileRepo();
    const deploymentFileGenerator = new DeploymentFileGenerator(deploymentFileRepo);
    const ARTIFACTS_FOLDER = 'artifacts';
    const systemCrawlingService = new SystemCrawlingService(currentPath, ARTIFACTS_FOLDER);
    const tutorialService = new TutorialService(
      deploymentFileGenerator,
      systemCrawlingService
    );

    const moduleState = new FileSystemModuleState(currentPath);
    const stateMigrationService = new StateMigrationService(moduleState, from as Migration);
    const moduleMigrationService = new ModuleMigrationService(currentPath);

    const moduleDeploymentSummaryService = new ModuleDeploymentSummaryService(moduleStateRepo);
    const moduleUsage = new ModuleUsage(deploymentPath, moduleStateRepo);

    return {
      networkName,
      networkId,
      gasPriceBackoff,
      rpcProvider,
      filePath,
      states,
      logger,
      config,
      configService,

      deploymentPath,
      gasProvider,
      eventSession,
      moduleStateRepo,
      moduleResolver,
      txGenerator,
      txExecutor,
      walletWrapper,
      moduleDeploymentSummaryService,

      analyticsService,
      tutorialService,
      stateMigrationService,
      moduleMigrationService,
      moduleUsage,
      moduleTyping,
    };
  }
}
