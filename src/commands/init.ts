import { Command, flags } from '@oclif/command';
import ConfigService from '../packages/config/service';
import { cli } from 'cli-ux';
import * as command from '../index';
import { UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { StreamlinedPrompter } from '../packages/utils/promter/prompter';
import { IPrompter } from '../packages/utils/promter';

export default class Init extends Command {
  static description = 'Initialize ignition configuration file and configuration script.';
  private prompter: IPrompter | undefined;

  static flags = {
    help: flags.help({char: 'h'}),
    privateKeys: flags.string(
      {
        name: 'private_keys',
        description: 'Private Keys of the deployer accounts e.g. 0x123...,0x123...,0x123',
        required: true,
      }
    ),
    mnemonic: flags.string(
      {
        name: 'mnemonic',
        description: 'Mnemonic of the deployer accounts',
        required: false,
      }
    ),
    configScriptPath: flags.string(
      {
        name: 'configScriptPath',
        description: 'Path to the ignition.config.js script, default is same as current path.',
      }
    ),
    hdPath: flags.string(
      {
        name: 'hdPath',
        description: `Associated with mnemonic - The HD parent of all the derived keys. Default value: "m/44'/60'/0'/0"`,
        required: false,
      }
    ),
    reinit: flags.boolean(
      {
        name: 'reinit',
        description: 'Provide this flag if you would like to overwrite `ignition.config.ts`, otherwise if exists, it would error.',
        required: false,
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Flag used for debugging'
      }
    )
  };


  async run() {
    const {args, flags} = this.parse(Init);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    this.prompter = new StreamlinedPrompter();

    const configService = new ConfigService(process.cwd());

    command.init(flags, configService);
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
