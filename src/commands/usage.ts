import { Command, flags } from '@oclif/command';
import ConfigService from '../packages/config/service';
import { cli } from 'cli-ux';
import * as command from '../index';
import { CliError, UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { IPrompter } from '../packages/utils/logging';
import path from 'path';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { WalletWrapper } from '../index';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { ModuleUsage } from '../packages/modules/module_usage';
import { checkIfExist } from '../packages/utils/util';
import { DEFAULT_NETWORK_ID, DEFAULT_NETWORK_NAME } from '../packages/utils/constants';
import { ErrorReporting } from '../packages/utils/error_reporting';
import { GlobalConfigService } from '../packages/config/global_config_service';

export default class Usage extends Command {
  private mutex = false;
  static description = 'Generate public usage module from standard module.';
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
    const {args, flags} = this.parse(Usage);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
      process.env.DEBUG = '*';
    }

    const globalConfigService = new GlobalConfigService();
    await globalConfigService.mustConfirmConsent();
    this.errorReporting = new ErrorReporting(globalConfigService);

    const currentPath = process.cwd();
    const filePath = args.module_file_path as string;
    if (filePath == '') {
      cli.info('Their is no hardhat-ignition config, please run init first.\n   Use --help for more information.');
    }

    let networkName = flags.network;
    if (!checkIfExist(networkName)) {
      networkName = DEFAULT_NETWORK_NAME;
    }

    const configService = new ConfigService(networkName);
    const config = await configService.initializeIgnitionConfig(process.cwd(), flags.configScriptPath);

    let networkId = config.networks[networkName].networkId;
    if (!checkIfExist(networkId)) {
      networkId = DEFAULT_NETWORK_ID;
    }
    process.env.IGNITION_NETWORK_ID = String(networkId);

    this.prompter = new StreamlinedPrompter();

    const moduleStateRepo = new ModuleStateRepo(networkId, currentPath, this.mutex, flags.testEnv);
    const moduleResolver = new ModuleResolver(
      undefined,
      configService.getFirstPrivateKey(),
      this.prompter,
      undefined,
      moduleStateRepo,
      undefined,
      undefined,
      undefined
    );
    const walletWrapper = new WalletWrapper(
      undefined,
      undefined,
      undefined,
      undefined,
      moduleStateRepo,
      this.prompter,
      undefined
    );

    const deploymentFilePath = path.resolve(currentPath, filePath);
    const states: string[] = flags.state?.split(',') || [];
    const moduleUsage = new ModuleUsage(deploymentFilePath, moduleStateRepo);

    await command.usage(config, deploymentFilePath, states, configService, walletWrapper, moduleStateRepo, moduleResolver, moduleUsage, this.prompter);
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
