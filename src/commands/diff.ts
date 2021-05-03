import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { cli } from 'cli-ux';
import * as command from '../index';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { Wallet } from 'ethers';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import { GasPriceCalculator } from '../packages/ethereum/gas/calculator';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { TransactionManager } from '../packages/ethereum/transactions/manager';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';
import * as cls from 'cls-hooked';
import { ILogging } from '../packages/utils/logging';
import { EthClient } from '../packages/ethereum/client';
import { AnalyticsService } from '../packages/utils/analytics/analytics_service';
import { defaultInputParams, errorHandling } from '../index';
import { CommandParsingFailed } from '../packages/types/errors';

export default class Diff extends Command {
  static description = 'Difference between deployed and current deployment.';
  private prompter: ILogging | undefined;
  private analyticsService: AnalyticsService;

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
    } = await defaultInputParams.bind(this)(args.module_file_path, flags.network, flags.state, undefined, undefined, flags.configScriptPath);

    const currentPath = process.cwd();
    const resolvedPath = path.resolve(currentPath, filePath);

    const prompter = new StreamlinedPrompter(flags.noPrompt);
    this.prompter = prompter;

    const gasCalculator = new GasPriceCalculator(rpcProvider);
    const transactionManager = new TransactionManager(rpcProvider, new Wallet(configService.getFirstPrivateKey(), rpcProvider), networkId, gasCalculator, gasCalculator, prompter);
    const txGenerator = new EthTxGenerator(configService, gasCalculator, gasCalculator, networkId, rpcProvider, transactionManager, transactionManager, prompter);

    const moduleStateRepo = new ModuleStateRepo(networkName, currentPath);
    const eventSession = cls.createNamespace('event');
    const eventTxExecutor = new EventTxExecutor(eventSession, moduleStateRepo);
    const ethClient = new EthClient(rpcProvider);
    const moduleResolver = new ModuleResolver(rpcProvider, configService.getFirstPrivateKey(), prompter, txGenerator, moduleStateRepo, eventTxExecutor, eventSession, ethClient);

    await command.diff(resolvedPath, config, states, moduleResolver, moduleStateRepo, configService, this.analyticsService);
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
