import { Command, flags } from '@oclif/command';
import ConfigService from '../packages/config/service';
import { cli } from 'cli-ux';
import * as command from '../index';
import { UserError } from '../packages/types/errors';

export default class Init extends Command {
  static description = 'Initialize mortar configuration file';

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
        description: 'Path to the mortar.config.js script, default is same as current path.',
      }
    ),
    hdPath: flags.string(
      {
        name: 'hdPath',
        description: `Associated with mnemonic - The HD parent of all the derived keys. Default value: "m/44'/60'/0'/0"`,
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
    const {flags} = this.parse(Init);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    const configService = new ConfigService(process.cwd());

    command.init(flags, configService);
  }

  async catch(error: Error) {
    if (error instanceof UserError) {
      cli.info(error.message);
      cli.exit(0);
    }

    cli.error(error);
    cli.info('If above error is not something that you expect, please open GitHub issue with detailed description what happened to you.');
    await cli.url('Github issue link', 'https://github.com/Tenderly/mortar-tenderly/issues/new');
    cli.exit(1);
  }
}
