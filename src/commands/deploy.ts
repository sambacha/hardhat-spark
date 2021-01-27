import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { checkIfExist, checkMutex } from '../packages/utils/util';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import ConfigService from '../packages/config/service';
import { Prompter } from '../packages/prompter';
import { TxExecutor } from '../packages/ethereum/transactions/executor';
import { GasPriceCalculator } from '../packages/ethereum/gas/calculator';
import { ethers, Wallet } from 'ethers';
import { cli } from 'cli-ux';
import * as command from '../index';
import { EventHandler } from '../packages/modules/events/handler';
import { UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { TransactionManager } from '../packages/ethereum/transactions/manager';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';

export default class Deploy extends Command {
  private mutex = false;
  static description = 'Deploy new migrations, difference between current and already deployed.';

  static flags = {
    networkId: flags.integer(
      {
        name: 'network_id',
        description: 'Network ID of the network you are willing to deploy your contracts.',
        required: true
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
        description: 'If this flag is provided mortar will try to parallelize transactions, this mean that it will batch transaction and track dynamically their confirmation.',
        required: false,
      }
    ),
    yes: flags.boolean(
      {
        name: 'yes',
        description: 'Used to skip confirmation questions.'
      }
    ),
    state: flags.string(
      {
        name: 'state',
        description: 'Provide name of module\'s that you would want to use as state. Most commonly used if you are deploying more than one module that are dependant on each other.',
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

  static args = [{name: 'path'}];

  async run() {
    process.on('SIGINT', () => {
      checkMutex(this.mutex, 20, 10);

      process.exit(1);
    });

    const {args, flags} = this.parse(Deploy);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    const currentPath = process.cwd();
    const filePath = args.path as string;
    if (filePath == '') {
      cli.info('Their is no mortar config, please run init first.\n   Use --help for more information.');
    }
    if (!checkIfExist(flags.networkId)) {
      cli.info('Network id flag not provided, please use --help');
      cli.exit(1);
    }
    process.env.MORTAR_NETWORK_ID = String(flags.networkId);
    const states: string[] = flags.state?.split(',') || [];

    let provider = new ethers.providers.JsonRpcProvider();
    if (checkIfExist(flags.rpcProvider)) {
      provider = new ethers.providers.JsonRpcProvider(flags.rpcProvider);
    }

    process.env.MORTAR_RPC_PROVIDER = String(flags.rpcProvider || 'http://localhost:8545');

    let prompter = new Prompter(false);
    if (flags.yes) {
      prompter = new Prompter(true);
    }
    const configService = new ConfigService(currentPath);

    const gasCalculator = new GasPriceCalculator(provider);
    const transactionManager = new TransactionManager(provider, new Wallet(configService.getFirstPrivateKey(), provider), flags.networkId, gasCalculator, gasCalculator);
    const txGenerator = new EthTxGenerator(configService, gasCalculator, gasCalculator, flags.networkId, provider, transactionManager, transactionManager);

    const moduleState = new ModuleStateRepo(flags.networkId, currentPath, this.mutex, flags.testEnv);
    const eventTxExecutor = new EventTxExecutor();
    const moduleResolver = new ModuleResolver(provider, configService.getFirstPrivateKey(), prompter, txGenerator, moduleState, eventTxExecutor);

    const eventHandler = new EventHandler(moduleState);
    const txExecutor = new TxExecutor(prompter, moduleState, txGenerator, flags.networkId, provider, eventHandler, flags.parallelize);

    const deploymentFilePath = path.resolve(currentPath, filePath);

    await command.deploy(deploymentFilePath, states, moduleState, moduleResolver, txGenerator, prompter, txExecutor, configService);
  }

  async catch(error: Error) {
    if (error instanceof UserError) {
      cli.info(chalk.red.bold('ERROR'), error.message);
      cli.exit(1);
    }

    cli.info('\nIf below error is not something that you expect, please open GitHub issue with detailed description what happened to you.');
    cli.url('Github issue link', 'https://github.com/Tenderly/mortar-tenderly/issues/new');
    cli.error(error);
  }
}
