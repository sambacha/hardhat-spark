import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { ModuleStateRepo } from '../services/modules/states/state_repo';
import { ModuleResolver } from '../services/modules/module_resolver';
import { checkMutex, errorHandling } from '../services/utils/util';
import { EthTxGenerator } from '../services/ethereum/transactions/generator';
import { TxExecutor } from '../services/ethereum/transactions/executor';
import { GasPriceCalculator } from '../services/ethereum/gas/calculator';
import { Wallet } from 'ethers';
import { cli } from 'cli-ux';
import * as command from '../index';
import { defaultInputParams } from '../index';
import { EventHandler } from '../services/modules/events/handler';
import { TransactionManager } from '../services/ethereum/transactions/manager';
import { EventTxExecutor } from '../services/ethereum/transactions/event_executor';
import * as cls from 'cls-hooked';
import { ILogging, Logging } from '../services/utils/logging';
import { WalletWrapper } from '../services/ethereum/wallet/wrapper';
import { EthClient } from '../services/ethereum/client';
import { ModuleDeploymentSummaryService } from '../services/modules/module_deployment_summary';
import { CommandParsingFailed } from '../services/types/errors';
import { IAnalyticsService } from '../services/utils/analytics';

export default class Deploy extends Command {
  static description = 'Deploy new module, difference between current module and already deployed one.';

  private mutex = false;
  private prompter: ILogging | undefined;
  private analyticsService: IAnalyticsService | undefined;

  static flags = {
    network: flags.string(
      {
        name: 'network',
        description: 'Network name is specified inside your config file and if their is none it will default to local(http://localhost:8545)',
        required: false
      }
    ),
    rpcProvider: flags.string(
      {
        name: 'rpc_provider',
        description: 'RPC Provider - URL of open RPC interface for your ethereum node.',
        required: false
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Used for debugging purposes.'
      }
    ),
    parallelize: flags.boolean(
      {
        name: 'parallelize',
        description: 'If this flag is provided hardhat-ignition will try to parallelize transactions, this mean that it will batch transaction and track dynamically their confirmation.',
        required: false,
      }
    ),
    logging: flags.enum(
      {
        name: 'logging',
        description: 'Logging type: streamlined, overview or json. default: overview',
        options: [Logging.json, Logging.streamlined, Logging.simple, Logging.overview],
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
    testEnv: flags.boolean(
      {
        name: 'testEnv',
        description: 'This should be provided in case of test and/or CI/CD, it means that no state file will be store.'
      }
    ),
    help: flags.help({char: 'h'}),
  };

  static args = [{name: 'module_file_path'}];

  async run() {
    // maybe? move this to core
    process.on('SIGINT', () => {
      checkMutex(this.mutex, 20, 10);

      process.exit(1);
    });

    let args;
    let flags;
    try {
      const commandOutput = this.parse(Deploy);
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
      networkName,
      networkId,
      gasPriceBackoff,
      rpcProvider,
      filePath,
      states,
      logger,
      config,
      configService,
      parallelizeDeployment,
      analyticsService,
    } = await defaultInputParams(args.module_file_path, flags.network, flags.state, flags.rpcProvider, flags.logging, flags.configScriptPath);

    this.analyticsService = analyticsService;
    this.prompter = logger;
    const gasProvider = new GasPriceCalculator(rpcProvider);
    let gasCalculator = config.gasPriceProvider;
    if (!gasCalculator) {
      gasCalculator = gasProvider;
    }
    const transactionManager = new TransactionManager(rpcProvider, new Wallet(configService.getFirstPrivateKey(), rpcProvider), networkId, gasProvider, gasCalculator, this.prompter, gasPriceBackoff);
    const txGenerator = new EthTxGenerator(configService, gasCalculator, gasProvider, networkId, rpcProvider, transactionManager, transactionManager, this.prompter, gasPriceBackoff);

    const currentPath = process.cwd();
    const moduleStateRepo = new ModuleStateRepo(networkName, currentPath, this.mutex, flags.testEnv);

    const eventSession = cls.createNamespace('event');
    const eventTxExecutor = new EventTxExecutor(eventSession, moduleStateRepo);

    const ethClient = new EthClient(rpcProvider);
    const moduleResolver = new ModuleResolver(rpcProvider, configService.getFirstPrivateKey(), this.prompter, txGenerator, moduleStateRepo, eventTxExecutor, eventSession, ethClient);

    const eventHandler = new EventHandler(moduleStateRepo, this.prompter);
    const txExecutor = new TxExecutor(this.prompter, moduleStateRepo, txGenerator, networkId, rpcProvider, eventHandler, eventSession, eventTxExecutor, parallelizeDeployment);

    const walletWrapper = new WalletWrapper(eventSession, transactionManager, gasCalculator, gasProvider, moduleStateRepo, this.prompter, eventTxExecutor);

    const moduleDeploymentSummaryService = new ModuleDeploymentSummaryService(moduleStateRepo);

    const deploymentFilePath = path.resolve(currentPath, filePath);

    await command.deploy(deploymentFilePath, config, states, moduleStateRepo, moduleResolver, txGenerator, this.prompter, txExecutor, configService, walletWrapper, moduleDeploymentSummaryService, analyticsService);
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
