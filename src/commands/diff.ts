import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { cli } from 'cli-ux';
import * as command from '../index';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { checkIfExist } from '../packages/utils/util';
import { ethers, Wallet } from 'ethers';
import ConfigService from '../packages/config/service';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import { GasPriceCalculator } from '../packages/ethereum/gas/calculator';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { CliError, UserError } from '../packages/types/errors';
import { TransactionManager } from '../packages/ethereum/transactions/manager';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';
import * as cls from 'cls-hooked';
import chalk from 'chalk';
import { IPrompter } from '../packages/utils/logging';
import { SystemCrawlingService } from '../packages/tutorial/system_crawler';
import { DEFAULT_DEPLOYMENT_FOLDER, DEFAULT_NETWORK_ID, DEFAULT_NETWORK_NAME } from '../packages/utils/constants';
import fs from 'fs';
import * as inquirer from 'inquirer';
import { EthClient } from '../packages/ethereum/client';
import { ErrorReporting } from '../packages/utils/error_reporting';
import { GlobalConfigService } from '../packages/config/global_config_service';

export default class Diff extends Command {
  static description = 'Difference between deployed and current deployment.';
  private prompter: IPrompter | undefined;
  private errorReporting: ErrorReporting;

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
    const {args, flags} = this.parse(Diff);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
      process.env.DEBUG = '*';
    }

    const globalConfigService = new GlobalConfigService();
    await globalConfigService.mustConfirmConsent();
    this.errorReporting = new ErrorReporting(globalConfigService);

    const currentPath = process.cwd();

    let filePath = args.module_file_path as string;
    let networkName = flags.network;
    if (!checkIfExist(networkName)) {
      networkName = DEFAULT_NETWORK_NAME;
    }
    const configService = new ConfigService(networkName);
    const config = await configService.initializeIgnitionConfig(currentPath, flags.configScriptPath);

    let networkId;
    if (checkIfExist(config?.networks) && checkIfExist(config?.networks[networkName])) {
      networkId = config?.networks[networkName]?.networkId;
    }
    if (!checkIfExist(networkId)) {
      networkId = DEFAULT_NETWORK_ID;
    }
    process.env.IGNITION_NETWORK_ID = String(networkId);
    const states: string[] = flags.state?.split(',') || [];
    let provider = new ethers.providers.JsonRpcProvider();
    process.env.IGNITION_RPC_PROVIDER = 'http://localhost:8545';
    if (
      checkIfExist(config.networks) &&
      checkIfExist(config.networks[networkName])
    ) {
      if (checkIfExist(config.networks[networkName].rpcProvider)) {
        provider = new ethers.providers.JsonRpcProvider(
          String(config?.networks[networkName]?.rpcProvider)
        );
        process.env.IGNITION_RPC_PROVIDER = String(config?.networks[networkName]?.rpcProvider);
      }

      if (
        !checkIfExist(filePath) &&
        checkIfExist(config.networks[networkName].deploymentFilePath)
      ) {
        filePath = config.networks[networkName].deploymentFilePath;
        if (!fs.existsSync(filePath)) {
          filePath = undefined;
        }
      }
    }
    if (!checkIfExist(filePath)) {
      const systemCrawlingService = new SystemCrawlingService(currentPath, DEFAULT_DEPLOYMENT_FOLDER);
      const deploymentModules = systemCrawlingService.crawlDeploymentModule();
      const deploymentFileName = (await inquirer.prompt([{
        name: 'deploymentFileName',
        message: 'Deployments file:',
        type: 'list',
        choices: deploymentModules.map((v) => {
          return {
            name: v
          };
        }),
      }])).deploymentFileName;
      try {
        filePath = path.resolve(DEFAULT_DEPLOYMENT_FOLDER, deploymentFileName);
      } catch (e) {
        throw new UserError('Their is not deployment module provided.\n   Use --help for more information.');
      }
    }

    const resolvedPath = path.resolve(currentPath, filePath);

    const prompter = new StreamlinedPrompter(flags.noPrompt);
    this.prompter = prompter;

    const gasCalculator = new GasPriceCalculator(provider);
    const transactionManager = new TransactionManager(provider, new Wallet(configService.getFirstPrivateKey(), provider), networkId, gasCalculator, gasCalculator, prompter);
    const txGenerator = new EthTxGenerator(configService, gasCalculator, gasCalculator, networkId, provider, transactionManager, transactionManager, prompter);

    const moduleStateRepo = new ModuleStateRepo(networkName, currentPath);
    const eventSession = cls.createNamespace('event');
    const eventTxExecutor = new EventTxExecutor(eventSession);
    const ethClient = new EthClient(provider);
    const moduleResolver = new ModuleResolver(provider, configService.getFirstPrivateKey(), prompter, txGenerator, moduleStateRepo, eventTxExecutor, eventSession, ethClient);

    await command.diff(resolvedPath, config, states, moduleResolver, moduleStateRepo, configService);
  }

  async catch(error: Error) {
    if (this.prompter) {
      this.prompter.errorPrompt();
    }

    if ((error as UserError)._isUserError) {
      cli.info('Something went wrong inside deployment script, check the message below and try again.');
      if (cli.config.outputLevel == 'debug') {
        cli.debug(error.stack);
        return;
      }

      cli.info(chalk.red.bold('ERROR'), error.message);
      return;
    }

    if ((error as CliError)._isCliError) {
      cli.info('Something went wrong inside ignition');
      if (cli.config.outputLevel == 'debug') {
        cli.debug(error.stack);
        return;
      }

      cli.info(chalk.red.bold('ERROR'), error.message);
      return;
    }

    cli.error(error.message);
    if (cli.config.outputLevel == 'debug') {
      cli.debug(error.stack);
    }
    this.errorReporting.reportError(error);
  }
}
