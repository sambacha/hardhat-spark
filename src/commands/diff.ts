import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { cli } from 'cli-ux';
import * as command from '../index';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { checkIfExist } from '../packages/utils/util';
import { ethers, Wallet } from 'ethers';
import ConfigService from '../packages/config/service';
import { StreamlinedPrompter } from '../packages/utils/promter/prompter';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import { GasPriceCalculator } from '../packages/ethereum/gas/calculator';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { NetworkIdNotProvided, PathNotProvided, UserError } from '../packages/types/errors';
import { TransactionManager } from '../packages/ethereum/transactions/manager';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';
import * as cls from 'cls-hooked';
import chalk from 'chalk';
import { IPrompter } from '../packages/utils/promter';

export default class Diff extends Command {
  static description = 'Difference between deployed and current migrations.';
  private prompter: IPrompter | undefined;

  static flags = {
    help: flags.help({char: 'h'}),
    networkId: flags.integer(
      {
        name: 'network_id',
        description: 'Network ID of the network you are willing to deploy your contracts.',
        required: true
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Flag used for debugging'
      }
    ),
    state: flags.string(
      {
        name: 'state',
        description: 'Provide name of module\'s that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other.',
      }
    ),
    configScriptPath: flags.string(
      {
        name: 'configScriptPath',
        description: 'Path to the mortar.config.js script, default is same as current path.',
      }
    ),
  };

  static args = [{name: 'module_file_path'}];

  async run() {
    const {args, flags} = this.parse(Diff);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    const currentPath = process.cwd();
    const filePath = args.module_file_path as string;
    if (filePath == '') {
      throw new PathNotProvided('Path argument missing from command. \nPlease use --help to better understand usage of this command');
    }
    if (!checkIfExist(flags.networkId)) {
      throw new NetworkIdNotProvided('Network id flag not provided, please use --help');
    }
    process.env.MORTAR_NETWORK_ID = String(flags.networkId);
    const states: string[] = flags.state?.split(',') || [];

    const resolvedPath = path.resolve(currentPath, filePath);

    const provider = new ethers.providers.JsonRpcProvider();
    const configService = new ConfigService(currentPath);

    const gasCalculator = new GasPriceCalculator(provider);
    const transactionManager = new TransactionManager(provider, new Wallet(configService.getFirstPrivateKey(), provider), flags.networkId, gasCalculator, gasCalculator);
    const txGenerator = new EthTxGenerator(configService, gasCalculator, gasCalculator, flags.networkId, provider, transactionManager, transactionManager);

    const prompter = new StreamlinedPrompter();
    this.prompter = prompter;

    const moduleStateRepo = new ModuleStateRepo(flags.networkId, currentPath);
    const eventSession = cls.createNamespace('event');
    const eventTxExecutor = new EventTxExecutor(eventSession);
    const moduleResolver = new ModuleResolver(provider, configService.getFirstPrivateKey(), prompter, txGenerator, moduleStateRepo, eventTxExecutor, eventSession);

    const config = await configService.getMortarConfig(process.cwd(), flags.configScriptPath);

    await command.diff(resolvedPath, config, states, moduleResolver, moduleStateRepo, configService);
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
    cli.url('Github issue link', 'https://github.com/Tenderly/mortar-tenderly/issues/new');
    cli.error(error);
  }
}
