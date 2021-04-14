import { ConfigFlags, IIgnitionUsage } from './index';
import * as command from '../index';
import { checkIfExist } from '../packages/utils/util';
import { ethers, Wallet } from 'ethers';
import { GasPriceCalculator } from '../packages/ethereum/gas/calculator';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { EventHandler } from '../packages/modules/events/handler';
import { TxExecutor } from '../packages/ethereum/transactions/executor';
import { HardhatIgnitionConfig } from '../packages/types/config';
import MemoryConfigService from '../packages/config/memory_service';
import { IConfigService } from '../packages/config';
import { IGasProvider } from '../packages/ethereum/gas';
import { ModuleStateFile } from '../packages/modules/states/module';
import { TransactionManager } from '../packages/ethereum/transactions/manager';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';
import { WalletWrapper } from '../packages/ethereum/wallet/wrapper';
import * as cls from 'cls-hooked';
import { Namespace } from 'cls-hooked';
import { EmptyPrompter } from '../packages/utils/logging/empty_logging';
import { IPrompter } from '../packages/utils/logging';
import { EthClient } from '../packages/ethereum/client';
import { ModuleDeploymentSummaryService } from '../packages/modules/module_deployment_summary';
import { IAnalyticsService } from '../packages/utils/analytics';
import { EmptyAnalyticsService } from '../packages/utils/analytics/empty_analytics_service';


export class IgnitionTests implements IIgnitionUsage {
  public configFlags: ConfigFlags;
  public configFile: HardhatIgnitionConfig;

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
  public moduleDeploymentSummaryService: ModuleDeploymentSummaryService;
  public analyticsService: IAnalyticsService;

  constructor(configFlags: ConfigFlags, configFile: HardhatIgnitionConfig) {
    process.env.IGNITION_NETWORK_ID = String(configFlags.networkId || '31337');
    this.states = configFlags.stateFileNames;

    this.provider = new ethers.providers.JsonRpcProvider();
    if (checkIfExist(configFlags.rpcProvider)) {
      this.provider = new ethers.providers.JsonRpcProvider(configFlags.rpcProvider);
    }

    process.env.IGNITION_RPC_PROVIDER = String(configFlags.rpcProvider || 'http://localhost:8545');

    this.prompter = new EmptyPrompter();
    this.configService = new MemoryConfigService(configFile);

    this.gasProvider = new GasPriceCalculator(this.provider);

    this.transactionManager = new TransactionManager(this.provider, new Wallet(this.configService.getFirstPrivateKey(), this.provider), configFlags.networkId, this.gasProvider, this.gasProvider, this.prompter);
    this.txGenerator = new EthTxGenerator(this.configService, this.gasProvider, this.gasProvider, configFlags.networkId, this.provider, this.transactionManager, this.transactionManager, this.prompter);

    this.eventSession = cls.createNamespace('event');

    this.moduleStateRepo = new ModuleStateRepo(configFlags.networkName, 'test', false, true);
    this.eventTxExecutor = new EventTxExecutor(this.eventSession);
    const ethClient = new EthClient(this.provider);
    this.moduleResolver = new ModuleResolver(this.provider, this.configService.getFirstPrivateKey(), this.prompter, this.txGenerator, this.moduleStateRepo, this.eventTxExecutor, this.eventSession, ethClient);

    this.eventHandler = new EventHandler(this.moduleStateRepo, this.prompter);
    this.txExecutor = new TxExecutor(this.prompter, this.moduleStateRepo, this.txGenerator, configFlags.networkName, this.provider, this.eventHandler, this.eventSession, this.eventTxExecutor);

    this.walletWrapper = new WalletWrapper(this.eventSession, this.transactionManager, this.gasProvider, this.gasProvider, this.moduleStateRepo, this.prompter, this.eventTxExecutor);
    this.moduleDeploymentSummaryService = new ModuleDeploymentSummaryService(this.moduleStateRepo);
    this.analyticsService = new EmptyAnalyticsService();
  }

  cleanup() {
    this.moduleStateRepo.clear();
  }

  setStateFile(moduleName: string, stateFile: ModuleStateFile) {
    this.moduleStateRepo.storeNewState(moduleName, stateFile);
  }

  async getStateFile(moduleName: string): Promise<ModuleStateFile> {
    return this.moduleStateRepo.getStateIfExist(moduleName);
  }

  async deploy(deploymentFilePath: string): Promise<void> {
    await command.deploy(
      deploymentFilePath,
      this.configFile,
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
      true
    );
  }

  async diff(deploymentFilePath: string): Promise<void> {
    await command.diff(
      deploymentFilePath,
      this.configFile,
      this.states,
      this.moduleResolver,
      this.moduleStateRepo,
      this.configService,
      this.analyticsService,
      true
    );
  }
}
