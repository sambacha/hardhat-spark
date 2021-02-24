import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import { PathNotProvided, UserError } from '../packages/types/errors';
import path from 'path';
import { ModuleTypings } from '../packages/modules/typings';
import * as command from '../index';
import ConfigService from '../packages/config/service';
import chalk from 'chalk';
import { IPrompter } from '../packages/utils/promter';
import { StreamlinedPrompter } from '../packages/utils/promter/prompter';

export default class GenTypes extends Command {
  static description = 'It\'ll generate .d.ts file for written deployment modules for better type hinting.';
  private prompter: IPrompter | undefined;

  static flags = {
    help: flags.help({char: 'h'}),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Flag used for debugging.'
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
    const {args, flags} = this.parse(GenTypes);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    const currentPath = process.cwd();
    const filePath = args.module_file_path as string;
    if (filePath == '') {
      throw new PathNotProvided('Path argument missing from command. \nPlease use --help to better understand usage of this command');
    }

    this.prompter = new StreamlinedPrompter();

    const resolvedPath = path.resolve(currentPath, filePath);
    const typings = new ModuleTypings(currentPath);

    const configService = new ConfigService(currentPath);
    const mortarConfig = await configService.getMortarConfig(process.cwd(), flags.configScriptPath);

    await command.genTypes(resolvedPath, mortarConfig, typings, configService);
    this.prompter.generatedTypes();
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
