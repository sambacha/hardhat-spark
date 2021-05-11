import { Command, flags } from '@oclif/command';
import ConfigService from '../services/config/service';
import { cli } from 'cli-ux';
import * as command from '../index';
import { StreamlinedLogger } from '../services/utils/logging/streamlined_logger';
import { ILogging } from '../services/utils/logging';
import path from 'path';
import { ModuleStateRepo } from '../services/modules/states/state_repo';
import { defaultInputParams, errorHandling, IGasCalculator, WalletWrapper } from '../index';
import { ModuleResolver } from '../services/modules/module_resolver';
import { ModuleUsage } from '../services/modules/module_usage';
import { checkIfExist } from '../services/utils/util';
import { DEFAULT_NETWORK_ID, DEFAULT_NETWORK_NAME } from '../services/utils/constants';
import { AnalyticsService } from '../services/utils/analytics/analytics_service';
import { GlobalConfigService } from '../services/config/global_config_service';
import { CommandParsingFailed } from '../services/types/errors';
import * as cls from 'cls-hooked';
import { TransactionManager } from '../services/ethereum/transactions/manager';
import { Wallet } from 'ethers';
import { GasPriceCalculator } from '../services/ethereum/gas/calculator';
import { EventTxExecutor } from '../services/ethereum/transactions/event_executor';

export default class Usage extends Command {
  private mutex = false;
  static description = 'Generate public usage module from standard module.';
  private prompter: ILogging | undefined;
  private analyticsService: AnalyticsService | undefined;

  static flags = {
    help: flags.help({char: 'h'}),
    network: flags.string(
      {
        name: 'network',
        description: 'Network name is specified inside your config file and if their is none it will default to local(http://localhost:8545)',
        required: false
      }
    ),
    testEnv: flags.boolean(
      {
        name: 'testEnv',
        description: 'This should be provided in case of test and/or CI/CD, it means that no state file will be store.'
      }
    ),
    state: flags.string(
      {
        name: 'state',
        description: 'Provide name of module\'s that you would want to use as state. Most commonly used if you are deploying more than one module that are dependant on each other.',
      }
    ),
    configScriptPath: flags.string(
      {
        name: 'configScriptPath',
        description: 'Path to the hardhat-ignition.config.js script, default is same as current path.',
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Flag used for debugging'
      }
    )
  };

  static args = [{name: 'module_file_path'}];

  async run() {
    let args;
    let flags;
    try {
      const commandOutput = this.parse(Usage);
      args = commandOutput.args;
      flags = commandOutput.flags;
    } catch (err) {
      throw new CommandParsingFailed(err);
    }
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
      process.env.DEBUG = '*';
    }

    const {
      networkId,
      gasPriceBackoff,
      rpcProvider,
      filePath,
      states,
      config,
      configService,
    } = await defaultInputParams(args.module_file_path, flags.network, flags.state);

    const globalConfigService = new GlobalConfigService();
    await globalConfigService.mustConfirmConsent();
    this.analyticsService = new AnalyticsService(globalConfigService);

    const currentPath = process.cwd();

    this.prompter = new StreamlinedLogger();

    const moduleStateRepo = new ModuleStateRepo(networkId, currentPath, this.mutex, flags.testEnv);
    const eventSession = cls.createNamespace('event');
    const gasProvider = new GasPriceCalculator(rpcProvider);
    let gasPriceCalculator = config.gasPriceProvider;
    if (!gasPriceCalculator) {
      gasPriceCalculator = gasProvider;
    }
    const transactionManager = new TransactionManager(rpcProvider, new Wallet(configService.getFirstPrivateKey(), rpcProvider), networkId, gasProvider, gasPriceCalculator, this.prompter, gasPriceBackoff);
    const eventTxExecutor = new EventTxExecutor(eventSession, moduleStateRepo);
    const walletWrapper = new WalletWrapper(
      eventSession,
      transactionManager,
      gasPriceCalculator,
      gasProvider as IGasCalculator,
      moduleStateRepo,
      this.prompter,
      eventTxExecutor
    );

    const deploymentFilePath = path.resolve(currentPath, filePath);
    const moduleUsage = new ModuleUsage(deploymentFilePath, moduleStateRepo);

    await command.usage(config, deploymentFilePath, states, configService, walletWrapper, moduleStateRepo, moduleUsage, this.prompter, this.analyticsService);
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
