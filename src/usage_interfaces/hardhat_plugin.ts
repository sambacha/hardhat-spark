import { DeployArgs, DiffArgs, GenTypesArgs, IIgnition, MigrationArgs, TutorialArgs, UsageArgs } from './index';
import { ethers, Wallet } from 'ethers';
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
import { ILogging, Logging } from '../packages/utils/logging';
import { IConfigService, HardhatIgnitionConfig } from '../packages/config';
import { IGasProvider } from '../packages/ethereum/gas';
import { Namespace } from 'cls-hooked';
import '../packages/hardhat_plugin/type_extentions';
import * as command from '../index';
import { Migration } from '../packages/types/migration';
import { ModuleUsage } from '../packages/modules/module_usage';
import { defaultInputParams, ModuleTypings } from '../index';
import { StateMigrationService } from '../packages/modules/states/state_migration_service';
import { TutorialService } from '../packages/tutorial/tutorial_service';
import { SystemCrawlingService } from '../packages/tutorial/system_crawler';
import { DeploymentFileGenerator } from '../packages/tutorial/deployment_file_gen';
import { DeploymentFileRepo } from '../packages/tutorial/deployment_file_repo';
import { FileSystemModuleState } from '../packages/modules/states/module/file_system';
import { ModuleMigrationService } from '../packages/modules/module_migration';
import { EthClient } from '../packages/ethereum/client';
import { ModuleDeploymentSummaryService } from '../packages/modules/module_deployment_summary';
import { AnalyticsService } from '../packages/utils/analytics/analytics_service';
import * as path from 'path';

export type Args = {
  moduleFilePath?: string;
  networkName?: string;
  rpcProvider?: string;
  parallelize?: boolean;
  logging?: Logging;
  state?: string;
  configScriptPath?: string;
  testEnv?: boolean;
  from?: string;
  moduleName?: string;
};

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
  public states: string[] | undefined;
  public provider: ethers.providers.JsonRpcProvider | undefined;
  public prompter: ILogging | undefined;
  public configService: IConfigService | undefined;
  public gasProvider: IGasProvider | undefined;
  public txGenerator: EthTxGenerator | undefined;
  public moduleStateRepo: ModuleStateRepo | undefined;
  public moduleResolver: ModuleResolver | undefined;
  public eventHandler: EventHandler | undefined;
  public txExecutor: TxExecutor | undefined;
  public transactionManager: TransactionManager | undefined;
  public eventTxExecutor: EventTxExecutor | undefined;
  public eventSession: Namespace | undefined;
  public walletWrapper: WalletWrapper | undefined;

  public moduleTyping: ModuleTypings | undefined;
  public tutorialService: TutorialService | undefined;
  public stateMigrationService: StateMigrationService | undefined;
  public moduleUsage: ModuleUsage | undefined;
  public moduleMigrationService: ModuleMigrationService | undefined;
  public moduleDeploymentSummaryService: ModuleDeploymentSummaryService | undefined;
  public analyticsService: AnalyticsService | undefined ;

  public conf: HardhatIgnitionConfig | undefined;
  public deploymentPath: string = '';

  constructor() {
  }

  async deploy(args: DeployArgs): Promise<void> {
    await this.setupServicesAndEnvironment(args);

    await command.deploy(
      this.deploymentPath,
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
      this.analyticsService,
    );
  }

  async diff(args: DiffArgs): Promise<void> {
    await this.setupServicesAndEnvironment(args);

    await command.diff(
      this.deploymentPath,
      this.conf,
      this.states,
      this.moduleResolver,
      this.moduleStateRepo,
      this.configService,
      this.analyticsService,
    );
  }

  async genTypes(args: GenTypesArgs): Promise<void> {
    await this.setupServicesAndEnvironment(args);

    await command.genTypes(
      this.deploymentPath,
      this.conf,
      this.moduleTyping,
      this.configService,
      this.prompter,
      this.analyticsService,
    );
  }

  async migration(args: MigrationArgs): Promise<void> {
    await this.setupServicesAndEnvironment(args);

    await command.migrate(
      this.stateMigrationService,
      this.moduleMigrationService,
      args.moduleName,
      this.analyticsService,
    );
  }

  async tutorial(args: TutorialArgs): Promise<void> {
    await this.setupServicesAndEnvironment(args);

    await command.tutorial(
      this.tutorialService,
      this.analyticsService,
    );
  }

  async usage(args: UsageArgs): Promise<void> {
    await this.setupServicesAndEnvironment(args);

    await command.usage(
      this.conf,
      this.deploymentPath,
      (args.state || '').split(','),
      this.configService,
      this.walletWrapper,
      this.moduleStateRepo,
      this.moduleResolver,
      this.moduleUsage,
      this.prompter,
      this.analyticsService,
    );
  }

  private async setupServicesAndEnvironment(args: Args): Promise<void> {
    const {
      networkName,
      networkId,
      gasPriceBackoff,
      rpcProvider,
      filePath,
      states,
      prompter,
      config,
      configService,
    } = await defaultInputParams.bind(this)(args.moduleFilePath, args.networkName, args.state, args.rpcProvider, args.logging, args.configScriptPath);

    const currentPath = process.cwd();
    this.deploymentPath = path.resolve(currentPath, filePath);
    this.prompter = prompter;
    this.provider = rpcProvider;
    this.configService = configService;
    this.states = states;
    this.conf = config;

    this.gasProvider = new GasPriceCalculator(this.provider);
    this.eventSession = cls.createNamespace('event');

    this.moduleStateRepo = new ModuleStateRepo(networkName, currentPath, false);
    this.eventTxExecutor = new EventTxExecutor(this.eventSession, this.moduleStateRepo);

    process.env.IGNITION_NETWORK_ID = String(networkId);

    this.transactionManager = new TransactionManager(this.provider, new Wallet(this.configService.getFirstPrivateKey(), this.provider), networkId, this.gasProvider, this.gasProvider, this.prompter, gasPriceBackoff);
    this.txGenerator = new EthTxGenerator(this.configService, this.gasProvider, this.gasProvider, networkId, this.provider, this.transactionManager, this.transactionManager, this.prompter, gasPriceBackoff);

    this.eventHandler = new EventHandler(this.moduleStateRepo, this.prompter);
    this.txExecutor = new TxExecutor(this.prompter, this.moduleStateRepo, this.txGenerator, networkId, this.provider, this.eventHandler, this.eventSession, this.eventTxExecutor);

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
    this.moduleUsage = new ModuleUsage(this.deploymentPath, this.moduleStateRepo);
  }
}
