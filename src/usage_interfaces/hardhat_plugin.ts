import { DeployArgs, DiffArgs, GenTypesArgs, IMortar, InitArgs, MigrationArgs, TutorialArgs, UsageArgs } from './index';
import { ethers, Wallet } from 'ethers';
import { checkIfExist } from '../packages/utils/util';
import { EmptyPrompter } from '../packages/utils/promter/empty_prompter';
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
import { IPrompter, Prompters } from '../packages/utils/promter';
import { IConfigService, MortarConfig } from '../packages/config';
import { IGasProvider } from '../packages/ethereum/gas';
import { Namespace } from 'cls-hooked';
import { Config } from '../packages/types/config';
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
import { StreamlinedPrompter } from '../packages/utils/promter/prompter';
import { JsonPrompter } from '../packages/utils/promter/json_prompter';
import { OverviewPrompter } from '../packages/utils/promter/overview_prompter';
import { SimpleOverviewPrompter } from '../packages/utils/promter/simple_prompter';

export type HardhatMortarConfig = {
  config: Config,
  mortarConfig: MortarConfig
};

export type Args = {
  modulePath?: string;
  networkId?: string;
  rpcProvider?: string;
  parallelize?: boolean;
  prompting?: Prompters;
  state?: string;
  configScriptPath?: string;
  testEnv?: boolean;
  from?: string;
  moduleName?: string;
};

export class MortarHardhatActions {
  static async deploy(config: HardhatMortarConfig, args: DeployArgs): Promise<void> {
    const mortarHardhat = new MortarHardhat(config);
    const fullPath = path.resolve(process.cwd(), args.moduleFilePath);

    await mortarHardhat.deploy(fullPath, args);
  }

  static async diff(config: HardhatMortarConfig, args: DiffArgs): Promise<void> {
    const mortarHardhat = new MortarHardhat(config);
    const fullPath = path.resolve(process.cwd(), args.moduleFilePath);

    await mortarHardhat.diff(fullPath, args);
  }

  static async genTypes(config: HardhatMortarConfig, args: GenTypesArgs): Promise<void> {
    const mortarHardhat = new MortarHardhat(config);
    const fullPath = path.resolve(process.cwd(), args.moduleFilePath);

    await mortarHardhat.genTypes(fullPath, args);
  }

  static async init(config: HardhatMortarConfig, args: InitArgs): Promise<void> {
    const mortarHardhat = new MortarHardhat(config);

    await mortarHardhat.init(args);
  }

  static async migration(config: HardhatMortarConfig, args: MigrationArgs): Promise<void> {
    const mortarHardhat = new MortarHardhat(config);

    await mortarHardhat.migration(args);
  }

  static async tutorial(config: HardhatMortarConfig, args: TutorialArgs): Promise<void> {
    const mortarHardhat = new MortarHardhat(config);

    await mortarHardhat.tutorial(args);
  }

  static async usage(config: HardhatMortarConfig, args: UsageArgs): Promise<void> {
    const mortarHardhat = new MortarHardhat(config);
    const fullPath = path.resolve(process.cwd(), args.moduleFilePath);

    await mortarHardhat.usage(fullPath, args);
  }
}

export class MortarHardhat implements IMortar {
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

  public conf: HardhatMortarConfig;

  constructor(conf: HardhatMortarConfig) {
    this.conf = conf;
  }

  async deploy(moduleFilePath: string, args: DeployArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf.config, args);

    await command.deploy(
      moduleFilePath,
      this.conf.mortarConfig,
      this.states,
      this.moduleStateRepo,
      this.moduleResolver,
      this.txGenerator,
      this.prompter,
      this.txExecutor,
      this.configService,
      this.walletWrapper,
    );
  }

  async diff(moduleFilePath: string, args: DiffArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf.config, args);

    await command.diff(
      moduleFilePath,
      this.conf.mortarConfig,
      this.states,
      this.moduleResolver,
      this.moduleStateRepo,
      this.configService,
    );
  }

  async genTypes(moduleFilePath: string, args: GenTypesArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf.config, args);

    await command.genTypes(
      moduleFilePath,
      this.conf.mortarConfig,
      this.moduleTyping,
      this.configService,
    );
  }

  async init(args: InitArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf.config, args);

    await command.init(
      args,
      this.configService,
    );
  }

  async migration(args: MigrationArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf.config, args);

    await command.migrate(
      this.stateMigrationService,
      args.from as Migration,
      args.moduleName,
    );
  }

  async tutorial(args: TutorialArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf.config, args);

    await command.tutorial(
      this.tutorialService
    );
  }

  async usage(moduleFilePath: string, args: UsageArgs): Promise<void> {
    await this.setupServicesAndEnvironment(this.conf.config, args);
    this.moduleUsage = new ModuleUsage(moduleFilePath, this.moduleStateRepo);

    await command.usage(
      this.conf.mortarConfig,
      moduleFilePath,
      args.state.split(','),
      this.configService,
      this.walletWrapper,
      this.moduleStateRepo,
      this.moduleResolver,
      this.moduleUsage,
      this.prompter,
    );
  }

  private async setupServicesAndEnvironment(configFile: Config, args: Args): Promise<void> {
    // @TODO singleton and partial reinit if needed.
    const currentPath = process.cwd();

    let prompter;
    switch (args.prompting) {
      case Prompters.streamlined:
        prompter = new StreamlinedPrompter();
        break;
      case Prompters.json:
        prompter = new JsonPrompter();
        break;
      case Prompters.overview:
        prompter = new OverviewPrompter();
        break;
      case Prompters.simple:
      default: {
        prompter = new SimpleOverviewPrompter();
      }
    }
    this.prompter = prompter;

    this.provider = new ethers.providers.JsonRpcProvider();
    if (checkIfExist(args.rpcProvider)) {
      this.provider = new ethers.providers.JsonRpcProvider(args.rpcProvider);
    }

    process.env.MORTAR_RPC_PROVIDER = String(args?.rpcProvider || 'http://localhost:8545');

    this.gasProvider = new GasPriceCalculator(this.provider);
    this.configService = new MemoryConfigService(configFile);

    this.eventSession = cls.createNamespace('event');
    this.eventTxExecutor = new EventTxExecutor(this.eventSession);

    if (checkIfExist(args.networkId)) {
      process.env.MORTAR_NETWORK_ID = String(args.networkId);

      this.transactionManager = new TransactionManager(this.provider, new Wallet(this.configService.getFirstPrivateKey(), this.provider), +args.networkId, this.gasProvider, this.gasProvider);
      this.txGenerator = new EthTxGenerator(this.configService, this.gasProvider, this.gasProvider, +args.networkId, this.provider, this.transactionManager, this.transactionManager);

      this.moduleStateRepo = new ModuleStateRepo(+args.networkId, currentPath, false);

      this.eventHandler = new EventHandler(this.moduleStateRepo, this.prompter);
      this.txExecutor = new TxExecutor(this.prompter, this.moduleStateRepo, this.txGenerator, +args.networkId, this.provider, this.eventHandler, this.eventSession, this.eventTxExecutor);
    }

    if (checkIfExist(args.state)) {
      this.states = args.state.split(',');
    }

    this.moduleResolver = new ModuleResolver(this.provider, this.configService.getFirstPrivateKey(), this.prompter, this.txGenerator, this.moduleStateRepo, this.eventTxExecutor, this.eventSession);

    this.walletWrapper = new WalletWrapper(this.eventSession, this.transactionManager, this.gasProvider, this.gasProvider, this.moduleStateRepo, this.prompter, this.eventTxExecutor);
    this.moduleTyping = new ModuleTypings();

    const deploymentFileRepo = new DeploymentFileRepo();
    const deploymentFileGenerator = new DeploymentFileGenerator(deploymentFileRepo);
    const systemCrawlingService = new SystemCrawlingService(currentPath);
    this.tutorialService = new TutorialService(
      deploymentFileGenerator,
      systemCrawlingService
    );

    const moduleState = new FileSystemModuleState(currentPath);
    this.stateMigrationService = new StateMigrationService(moduleState);
  }
}
