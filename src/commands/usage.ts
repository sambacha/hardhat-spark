import { Command, flags } from '@oclif/command';
import ConfigService from '../packages/config/service';
import { cli } from 'cli-ux';
import * as command from '../index';
import { UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { StreamlinedPrompter } from '../packages/utils/promter/prompter';
import { IPrompter } from '../packages/utils/promter';
import path from 'path';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { WalletWrapper } from '../index';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { ModuleUsage } from '../packages/modules/module_usage';

export default class Usage extends Command {
  private mutex = false;
  static description = 'Generate public usage module from standard module.';
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
        description: 'Path to the ignition.config.js script, default is same as current path.',
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
    const currentPath = process.cwd();
    const filePath = args.module_file_path as string;
    if (filePath == '') {
      cli.info('Their is no ignition config, please run init first.\n   Use --help for more information.');
    }

    process.env.IGNITION_NETWORK_ID = String(flags.networkId);
    this.prompter = new StreamlinedPrompter();

    const configService = new ConfigService(process.cwd());
    const moduleStateRepo = new ModuleStateRepo(flags.networkId, currentPath, this.mutex, flags.testEnv);
    const moduleResolver = new ModuleResolver(
      undefined,
      configService.getFirstPrivateKey(),
      this.prompter,
      undefined,
      moduleStateRepo,
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

    const config = await configService.getIgnitionConfig(process.cwd(), flags.configScriptPath);
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
      cli.info(chalk.red.bold('ERROR'), error.message);
      cli.exit(1);
    }

    cli.info('\nIf below error is not something that you expect, please open GitHub issue with detailed description what happened to you.');
    cli.url('Github issue link', 'https://github.com/Tenderly/ignition/issues/new');
    cli.error(error);
  }
}
