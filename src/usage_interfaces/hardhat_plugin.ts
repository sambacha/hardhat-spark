import { DeployArgs, DiffArgs, GenTypesArgs, IIgnition, InitArgs, MigrationArgs, TutorialArgs, UsageArgs } from './index';
import { ethers, Wallet } from 'ethers';
import { checkIfExist } from '../packages/utils/util';
import MemoryConfigService from '../packages/config/memory_service';
import { GasPriceCalculator } from '../packages/ethereum/gas/calculator';
import { TransactionManager } from '../packages/ethereum/transactions/manager';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import * as cls from 'cls-hooked';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { EventHandler } from '../packages/modules/events/handler';
import { TxExecutor } from '../packages/ethereum/transactions/executor';
import { WalletWrapper } from '../packages/ethereum/wallet/wrapper';
import { IPrompter, Logging } from '../packages/utils/logging';
import { IConfigService, HardhatIgnitionConfig } from '../packages/config';
import { IGasProvider } from '../packages/ethereum/gas';
import { Namespace } from 'cls-hooked';
import '../packages/hardhat_plugin/type_extentions';
import * as command from '../index';
import { Migration } from '../packages/types/migration';
import { ModuleUsage } from '../packages/modules/module_usage';
import { ModuleTypings } from '../index';
import { StateMigrationService } from '../packages/modules/states/state_migration_service';
import { TutorialService } from '../packages/tutorial/tutorial_service';
import { SystemCrawlingService } from '../packages/tutorial/system_crawler';
import { DeploymentFileGenerator } from '../packages/tutorial/deployment_file_gen';
import { DeploymentFileRepo } from '../packages/tutorial/deployment_file_repo';
import { FileSystemModuleState } from '../packages/modules/states/module/file_system';
import * as path from 'path';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { JsonPrompter } from '../packages/utils/logging/json_logging';
import { OverviewPrompter } from '../packages/utils/logging/overview_prompter';
import { SimpleOverviewPrompter } from '../packages/utils/logging/simple_logging';
import { ModuleMigrationService } from '../packages/modules/module_migration';
import { EthClient } from '../packages/ethereum/client';
import { ModuleDeploymentSummaryService } from '../packages/modules/module_deployment_summary';

export type HardhatPluginIgnitionConfig = HardhatIgnitionConfig;

export type Args = {
  modulePath?: string;
  networkId?: string;
  rpcProvider?: string;
  parallelize?: boolean;
  prompting?: Logging;
  state?: string;
  configScriptPath?: string;
  testEnv?: boolean;
  from?: string;
  moduleName?: string;
};

export class IgnitionHardhatActions {
  static async deploy(config: HardhatPluginIgnitionConfig, args: DeployArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition(config);
    const fullPath = path.resolve(process.cwd(), args.moduleFilePath);

    await ignitionHardhat.deploy(fullPath, args);
  }

  static async diff(config: HardhatPluginIgnitionConfig, args: DiffArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition(config);
    const fullPath = path.resolve(process.cwd(), args.moduleFilePath);

    await ignitionHardhat.diff(fullPath, args);
  }

  static async genTypes(config: HardhatPluginIgnitionConfig, args: GenTypesArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition(config);
    const fullPath = path.resolve(process.cwd(), args.moduleFilePath);

    await ignitionHardhat.genTypes(fullPath, args);
  }

  static async migration(config: HardhatPluginIgnitionConfig, args: MigrationArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition(config);

    await ignitionHardhat.migration(args);
  }

  static async tutorial(config: HardhatPluginIgnitionConfig, args: TutorialArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition(config);

    await ignitionHardhat.tutorial(args);
  }

  static async usage(config: HardhatPluginIgnitionConfig, args: UsageArgs): Promise<void> {
    const ignitionHardhat = new HardhatIgnition(config);
    const fullPath = path.resolve(process.cwd(), args.moduleFilePath);

    await ignitionHardhat.usage(fullPath, args);
  }
}

export class HardhatIgnition implements IIgnition {
  public states: string[];
  public provider: ethers.providers.JsonRpcProvider;
  public prompter: IPrompter;
  public configService: IConfigService;
  public gasProvider: IGasProvider;
  public txGenerator: EthTxGenerator;
  public moduleStateRepo: ModuleStateRepo;
  public moduleResolver: ModuleResolver;
  public eventHandler: EventHandler;
  public txExecutor: TxExecutor;
  public transactionManager: TransactionManager;
  public eventTxExecutor: EventTxExecutor;
  public eventSession: Namespace;
  public walletWrapper: WalletWrapper;

  public moduleTyping: ModuleTypings;
  public tutorialService: TutorialService;
  public stateMigrationService: StateMigrationService;
  public moduleUsage: ModuleUsage;
  public moduleMigrationService: ModuleMigrationService;
  public moduleDeploymentSummaryService: ModuleDeploymentSummaryService;


  public conf: HardhatPluginIgnitionConfig;

  constructor(conf: HardhatPluginIgnitionConfig) {
    this.conf = conf;
  }

  async deploy(fullPath: string, args: DeployArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf, args);

    await command.deploy(
      fullPath,
      this.conf,
      this.states,
      this.moduleStateRepo,
      this.moduleResolver,
      this.txGenerator,
      this.prompter,
      this.txExecutor,
      this.configService,
      this.walletWrapper,
      this.moduleDeploymentSummaryService,
    );
  }

  async diff(fullPath: string, args: DiffArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf, args);

    await command.diff(
      fullPath,
      this.conf,
      this.states,
      this.moduleResolver,
      this.moduleStateRepo,
      this.configService,
    );
  }

  async genTypes(fullPath: string, args: GenTypesArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf, args);

    await command.genTypes(
      fullPath,
      this.conf,
      this.moduleTyping,
      this.configService,
      this.prompter,
    );
  }

  async migration(args: MigrationArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf, args);

    await command.migrate(
      this.stateMigrationService,
      this.moduleMigrationService,
      args.moduleName,
    );
  }

  async tutorial(args: TutorialArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf, args);

    await command.tutorial(
      this.tutorialService
    );
  }

  async usage(fullPath: string, args: UsageArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf, args);
    this.moduleUsage = new ModuleUsage(fullPath, this.moduleStateRepo);

    await command.usage(
      this.conf,
      fullPath,
      args.state.split(','),
      this.configService,
      this.walletWrapper,
      this.moduleStateRepo,
      this.moduleResolver,
      this.moduleUsage,
      this.prompter,
    );
  }

  private async setupServicesAndEnvironment(configFile: HardhatIgnitionConfig, args: Args): Promise<void> {
    // @TODO singleton and partial reinit if needed.
    const currentPath = process.cwd();

    let prompter;
    switch (args.prompting) {
      case Logging.streamlined:
        prompter = new StreamlinedPrompter();
        break;
      case Logging.json:
        prompter = new JsonPrompter();
        break;
      case Logging.overview:
        prompter = new OverviewPrompter();
        break;
      case Logging.simple:
      default: {
        prompter = new SimpleOverviewPrompter();
      }
    }
    this.prompter = prompter;

    this.provider = new ethers.providers.JsonRpcProvider();
    if (checkIfExist(args.rpcProvider)) {
      this.provider = new ethers.providers.JsonRpcProvider(args.rpcProvider);
    }

    process.env.IGNITION_RPC_PROVIDER = String(args?.rpcProvider || 'http://localhost:8545');

    this.gasProvider = new GasPriceCalculator(this.provider);
    this.configService = new MemoryConfigService(configFile);

    this.eventSession = cls.createNamespace('event');
    this.eventTxExecutor = new EventTxExecutor(this.eventSession);

    if (checkIfExist(args.networkId)) {
      process.env.IGNITION_NETWORK_ID = String(args.networkId);

      this.transactionManager = new TransactionManager(this.provider, new Wallet(this.configService.getFirstPrivateKey(), this.provider), args.networkId, this.gasProvider, this.gasProvider);
      this.txGenerator = new EthTxGenerator(this.configService, this.gasProvider, this.gasProvider, args.networkId, this.provider, this.transactionManager, this.transactionManager);

      this.moduleStateRepo = new ModuleStateRepo(args.networkId, currentPath, false);

      this.eventHandler = new EventHandler(this.moduleStateRepo, this.prompter);
      this.txExecutor = new TxExecutor(this.prompter, this.moduleStateRepo, this.txGenerator, args.networkId, this.provider, this.eventHandler, this.eventSession, this.eventTxExecutor);
    }

    this.states = [];
    if (checkIfExist(args.state)) {
      this.states = args.state.split(',');
    }

    const ethClient = new EthClient(this.provider);
    this.moduleResolver = new ModuleResolver(this.provider, this.configService.getFirstPrivateKey(), this.prompter, this.txGenerator, this.moduleStateRepo, this.eventTxExecutor, this.eventSession, ethClient);

    this.walletWrapper = new WalletWrapper(this.eventSession, this.transactionManager, this.gasProvider, this.gasProvider, this.moduleStateRepo, this.prompter, this.eventTxExecutor);
    this.moduleTyping = new ModuleTypings();

    const deploymentFileRepo = new DeploymentFileRepo();
    const deploymentFileGenerator = new DeploymentFileGenerator(deploymentFileRepo);
    const ARTIFACTS_FOLDER = 'artifacts';
    const systemCrawlingService = new SystemCrawlingService(currentPath, ARTIFACTS_FOLDER);
    this.tutorialService = new TutorialService(
      deploymentFileGenerator,
      systemCrawlingService
    );

    const moduleState = new FileSystemModuleState(currentPath);
    this.stateMigrationService = new StateMigrationService(moduleState, args?.from as Migration);
    this.moduleMigrationService = new ModuleMigrationService(currentPath);

    this.moduleDeploymentSummaryService = new ModuleDeploymentSummaryService(this.moduleStateRepo);
  }
}
