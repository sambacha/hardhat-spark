import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { checkIfExist, checkMutex, errorHandling } from '../packages/utils/util';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import { TxExecutor } from '../packages/ethereum/transactions/executor';
import { GasPriceCalculator } from '../packages/ethereum/gas/calculator';
import { Wallet } from 'ethers';
import { cli } from 'cli-ux';
import * as command from '../index';
import { defaultInputParams } from '../index';
import { EventHandler } from '../packages/modules/events/handler';
import { TransactionManager } from '../packages/ethereum/transactions/manager';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';
import * as cls from 'cls-hooked';
import { ILogging, Logging } from '../packages/utils/logging';
import { WalletWrapper } from '../packages/ethereum/wallet/wrapper';
import { EthClient } from '../packages/ethereum/client';
import { ModuleDeploymentSummaryService } from '../packages/modules/module_deployment_summary';
import { AnalyticsService } from '../packages/utils/analytics/analytics_service';

export default class Deploy extends Command {
  static description = 'Deploy new module, difference between current module and already deployed one.';

  private mutex = false;
  private prompter: ILogging | undefined;
  private analyticsService: AnalyticsService;

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

    const {args, flags} = this.parse(Deploy);
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
      prompter,
      config,
      configService,
      parallelizeDeployment,
    } = await defaultInputParams.bind(this)(args.module_file_path, flags.network, flags.state, flags.rpcProvider, flags.logging, flags.configScriptPath);

    this.prompter = prompter;
    const gasProvider = new GasPriceCalculator(rpcProvider);
    let gasCalculator = config.gasPriceProvider;
    if (!checkIfExist(gasCalculator)) {
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

    await command.deploy(deploymentFilePath, config, states, moduleStateRepo, moduleResolver, txGenerator, this.prompter, txExecutor, configService, walletWrapper, moduleDeploymentSummaryService, this.analyticsService);
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
