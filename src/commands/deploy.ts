import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { checkIfExist, checkMutex } from '../packages/utils/util';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import ConfigService from '../packages/config/service';
import { StreamlinedPrompter } from '../packages/utils/promter/prompter';
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
import * as cls from 'cls-hooked';
import { IPrompter, Prompters } from '../packages/utils/promter';
import { OverviewPrompter } from '../packages/utils/promter/overview_prompter';
import { SimpleOverviewPrompter } from '../packages/utils/promter/simple_prompter';
import { WalletWrapper } from '../packages/ethereum/wallet/wrapper';
import { JsonPrompter } from '../packages/utils/promter/json_prompter';

export default class Deploy extends Command {
  private mutex = false;
  static description = 'Deploy new module, difference between current module and already deployed one.';
  private prompter: IPrompter | undefined;

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
    prompting: flags.enum(
      {
        name: 'prompting',
        description: 'Prompting type: streamlined, overview or json. default: overview',
        options: [Prompters.json, Prompters.streamlined, Prompters.simple],
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
        description: 'Path to the mortar.config.js script, default is same as current path.',
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
    process.on('SIGINT', () => {
      checkMutex(this.mutex, 20, 10);

      process.exit(1);
    });

    const {args, flags} = this.parse(Deploy);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    const currentPath = process.cwd();
    const filePath = args.module_file_path as string;
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

    let prompter;
    switch (flags.prompting) {
      case Prompters.streamlined:
        prompter = new StreamlinedPrompter(flags.yes);
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
    const configService = new ConfigService(currentPath);

    const gasCalculator = new GasPriceCalculator(provider);
    const transactionManager = new TransactionManager(provider, new Wallet(configService.getFirstPrivateKey(), provider), flags.networkId, gasCalculator, gasCalculator);
    const txGenerator = new EthTxGenerator(configService, gasCalculator, gasCalculator, flags.networkId, provider, transactionManager, transactionManager);

    const moduleState = new ModuleStateRepo(flags.networkId, currentPath, this.mutex, flags.testEnv);

    const eventSession = cls.createNamespace('event');
    const eventTxExecutor = new EventTxExecutor(eventSession);

    const moduleResolver = new ModuleResolver(provider, configService.getFirstPrivateKey(), prompter, txGenerator, moduleState, eventTxExecutor, eventSession);

    const eventHandler = new EventHandler(moduleState, prompter);
    const txExecutor = new TxExecutor(prompter, moduleState, txGenerator, flags.networkId, provider, eventHandler, eventSession, eventTxExecutor, flags.parallelize);

    const walletWrapper = new WalletWrapper(eventSession, transactionManager, gasCalculator, gasCalculator, moduleState, prompter, eventTxExecutor);

    const config = await configService.getMortarConfig(process.cwd(), flags.configScriptPath);
    const deploymentFilePath = path.resolve(currentPath, filePath);

    await command.deploy(deploymentFilePath, config, states, moduleState, moduleResolver, txGenerator, prompter, txExecutor, configService, walletWrapper);
  }

  async catch(error: Error) {
    if (this.prompter) {
      this.prompter.errorPrompt();
    }

    if ((error as UserError)._isUserError) {
      cli.info(chalk.red.bold('ERROR'), error.message);
      cli.exit(1);
    }

    cli.info('\nIf below error is not something that you expect, please open GitHub issue with detailed description what happened to you.');
    cli.url('Github issue link', 'https://github.com/Tenderly/mortar/issues/new');
    cli.error(error);
  }
}
