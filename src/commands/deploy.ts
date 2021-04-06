import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { checkIfExist, checkMutex } from '../packages/utils/util';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import ConfigService from '../packages/config/service';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { TxExecutor } from '../packages/ethereum/transactions/executor';
import { GasPriceCalculator } from '../packages/ethereum/gas/calculator';
import { ethers, Wallet } from 'ethers';
import { cli } from 'cli-ux';
import * as command from '../index';
import { EventHandler } from '../packages/modules/events/handler';
import { CliError, UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { TransactionManager } from '../packages/ethereum/transactions/manager';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';
import * as cls from 'cls-hooked';
import { IPrompter, Logging } from '../packages/utils/logging';
import { OverviewPrompter } from '../packages/utils/logging/overview_prompter';
import { SimpleOverviewPrompter } from '../packages/utils/logging/simple_logging';
import { WalletWrapper } from '../packages/ethereum/wallet/wrapper';
import { JsonPrompter } from '../packages/utils/logging/json_logging';
import * as inquirer from 'inquirer';
import { SystemCrawlingService } from '../packages/tutorial/system_crawler';
import * as fs from 'fs';
import { EthClient } from '../packages/ethereum/client';
import { DEFAULT_DEPLOYMENT_FOLDER, DEFAULT_NETWORK_ID, DEFAULT_NETWORK_NAME } from '../packages/utils/constants';
import { ModuleDeploymentSummaryService } from '../packages/modules/module_deployment_summary';

export default class Deploy extends Command {
  private mutex = false;
  static description = 'Deploy new module, difference between current module and already deployed one.';
  private prompter: IPrompter | undefined;

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
        options: [Logging.json, Logging.streamlined, Logging.simple],
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
    process.on('SIGINT', () => {
      checkMutex(this.mutex, 20, 10);

      process.exit(1);
    });

    const {args, flags} = this.parse(Deploy);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
      process.env.DEBUG = '*';
    }

    const currentPath = process.cwd();
    const systemCrawlingService = new SystemCrawlingService(process.cwd(), DEFAULT_DEPLOYMENT_FOLDER);
    const deploymentModules = systemCrawlingService.crawlDeploymentModule();

    let filePath = args.module_file_path as string;
    let networkName = flags.network;
    let isLocalDeployment = true;
    let gasPriceBackoff;
    if (!checkIfExist(networkName)) {
      networkName = DEFAULT_NETWORK_NAME;
    }
    const configService = new ConfigService(networkName);
    const config = await configService.initializeIgnitionConfig(process.cwd(), flags.configScriptPath);

    let networkId = config.networks[networkName]?.networkId || undefined;
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

      if (checkIfExist(config.networks[networkName].blockConfirmation)) {
        process.env.BLOCK_CONFIRMATION_NUMBER = String(config.networks[networkName].blockConfirmation);
      }

      if (checkIfExist(config.networks[networkName].localDeployment)) {
        isLocalDeployment = config.networks[networkName].localDeployment;
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

      if (
        checkIfExist(config.networks[networkName].gasPriceBackoff)
      ) {
        gasPriceBackoff = config.networks[networkName].gasPriceBackoff;
      }
    }
    if (!checkIfExist(filePath)) {
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
    if (checkIfExist(flags.rpcProvider)) {
      provider = new ethers.providers.JsonRpcProvider(
        flags?.rpcProvider
      );
      process.env.IGNITION_RPC_PROVIDER = String(flags?.rpcProvider);
    }

    // choosing right prompter from user desires
    let prompter;
    switch (flags.logging) {
      case Logging.streamlined:
        let yes = true;
        if (
          networkName != DEFAULT_NETWORK_NAME &&
          !isLocalDeployment
        ) {
          const con = await cli.prompt('Would you like to be prompted at every single step? (Y/n)', {
            required: false
          });
          yes = con == 'n';
        }

        prompter = new StreamlinedPrompter(yes);
        break;
      case Logging.json:
        prompter = new JsonPrompter();
        break;
      case Logging.overview:
        prompter = new OverviewPrompter();
        break;
      case Logging.simple:
      default: {
        prompter = new SimpleOverviewPrompter();
      }
    }

    // initializing all service's and repos
    this.prompter = prompter;

    const gasProvider = new GasPriceCalculator(provider);
    let gasCalculator = config.gasPriceProvider;
    if (!checkIfExist(gasCalculator)) {
      gasCalculator = gasProvider;
    }
    const transactionManager = new TransactionManager(provider, new Wallet(configService.getFirstPrivateKey(), provider), networkId, gasProvider, gasCalculator, gasPriceBackoff);
    const txGenerator = new EthTxGenerator(configService, gasCalculator, gasProvider, networkId, provider, transactionManager, transactionManager, gasPriceBackoff);

    const moduleState = new ModuleStateRepo(networkName, currentPath, this.mutex, flags.testEnv);

    const eventSession = cls.createNamespace('event');
    const eventTxExecutor = new EventTxExecutor(eventSession);

    const ethClient = new EthClient(provider);
    const moduleResolver = new ModuleResolver(provider, configService.getFirstPrivateKey(), prompter, txGenerator, moduleState, eventTxExecutor, eventSession, ethClient);

    const eventHandler = new EventHandler(moduleState, prompter);
    const txExecutor = new TxExecutor(prompter, moduleState, txGenerator, networkId, provider, eventHandler, eventSession, eventTxExecutor, flags.parallelize);

    const walletWrapper = new WalletWrapper(eventSession, transactionManager, gasCalculator, gasProvider, moduleState, prompter, eventTxExecutor);

    const moduleDeploymentSummaryService = new ModuleDeploymentSummaryService(moduleState);

    const deploymentFilePath = path.resolve(currentPath, filePath);
    await command.deploy(deploymentFilePath, config, states, moduleState, moduleResolver, txGenerator, prompter, txExecutor, configService, walletWrapper, moduleDeploymentSummaryService);
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
  }
}
