import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as command from '../index';
import { UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { StreamlinedPrompter } from '../packages/utils/promter/prompter';
import { Migration } from '../packages/types/migration';
import { StateMigrationService } from '../packages/modules/states/state_migration_service';
import { FileSystemModuleState } from '../packages/modules/states/module/file_system';

export default class Tutorial extends Command {
  static description = 'Migrate deployment meta data from other deployers to mortar state file.';
  private prompter: StreamlinedPrompter;

  static flags = {
    help: flags.help({char: 'h'}),
    from: flags.enum({
      name: 'from',
      description: 'Deployment package name (truffle)',
      options: [Migration.truffle],
      default: Migration.truffle
    }),
    moduleName: flags.string({
      name: 'moduleName',
      description: 'Module name for which you would like to migrate state file to.'
    }),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Flag used for debugging'
      }
    )
  };


  async run() {
    const {args, flags} = this.parse(Tutorial);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    let moduleName = flags.moduleName;
    if (!moduleName) {
      cli.info(chalk.gray('Module is encapsulation for smart contract infrastructure, in order to migrate build and artifacts files please provide module name.'));
      moduleName = await cli.prompt('Module name');
    }

    this.prompter = new StreamlinedPrompter();
    const moduleState = new FileSystemModuleState(process.cwd());
    const stateMigrationService = new StateMigrationService(moduleState);

    await command.migrate(stateMigrationService, flags.from, moduleName);
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
