import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { cli } from 'cli-ux';
import * as command from '../index';
import { ModuleResolver } from '../services/modules/module_resolver';
import { Wallet } from 'ethers';
import { StreamlinedLogger } from '../services/utils/logging/streamlined_logger';
import { EthTxGenerator } from '../services/ethereum/transactions/generator';
import { GasPriceCalculator } from '../services/ethereum/gas/calculator';
import { ModuleStateRepo } from '../services/modules/states/state_repo';
import { TransactionManager } from '../services/ethereum/transactions/manager';
import { EventTxExecutor } from '../services/ethereum/transactions/event_executor';
import * as cls from 'cls-hooked';
import { ILogging } from '../services/utils/logging';
import { EthClient } from '../services/ethereum/client';
import { defaultInputParams, errorHandling } from '../index';
import { CommandParsingFailed } from '../services/types/errors';
import { IAnalyticsService } from '../services/utils/analytics';

export default class Diff extends Command {
  static description = 'Difference between deployed and current deployment.';
  private prompter: ILogging | undefined;
  private analyticsService: IAnalyticsService | undefined;

  static flags = {
    help: flags.help({char: 'h'}),
    network: flags.string(
      {
        name: 'network',
        description: 'Network name is specified inside your config file and if their is none it will default to local(http://localhost:8545)',
        required: false
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
        description: 'Path to the hardhat-ignition.config.js script, default is same as current path.',
      }
    ),
    noPrompt: flags.boolean(
      {
        name: 'noPrompt',
        description: "If this flag is provided all prompts would default to 'Yes'.",
        required: false,
      }
    )
  };

  static args = [{name: 'module_file_path'}];

  async run() {
    let args;
    let flags;
    try {
      const commandOutput = this.parse(Diff);
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
      rpcProvider,
      filePath,
      states,
      config,
      configService,
      analyticsService,
    } = await defaultInputParams(args.module_file_path, flags.network, flags.state, undefined, undefined, flags.configScriptPath);

    this.analyticsService = analyticsService;
    const currentPath = process.cwd();
    const resolvedPath = path.resolve(currentPath, filePath);

    const prompter = new StreamlinedLogger(flags.noPrompt);
    this.prompter = prompter;

    const gasCalculator = new GasPriceCalculator(rpcProvider);
    const transactionManager = new TransactionManager(rpcProvider, new Wallet(configService.getFirstPrivateKey(), rpcProvider), networkId, gasCalculator, gasCalculator, prompter);
    const txGenerator = new EthTxGenerator(configService, gasCalculator, gasCalculator, networkId, rpcProvider, transactionManager, transactionManager, prompter);

    const moduleStateRepo = new ModuleStateRepo(networkName, currentPath);
    const eventSession = cls.createNamespace('event');
    const eventTxExecutor = new EventTxExecutor(eventSession, moduleStateRepo);
    const ethClient = new EthClient(rpcProvider);
    const moduleResolver = new ModuleResolver(rpcProvider, configService.getFirstPrivateKey(), prompter, txGenerator, moduleStateRepo, eventTxExecutor, eventSession, ethClient);

    await command.diff(resolvedPath, config, states, moduleResolver, moduleStateRepo, configService, analyticsService);
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
