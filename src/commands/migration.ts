import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as command from '../index';
import { CliError, UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { Migration } from '../packages/types/migration';
import { StateMigrationService } from '../packages/modules/states/state_migration_service';
import { FileSystemModuleState } from '../packages/modules/states/module/file_system';
import { IPrompter } from '../packages/utils/logging';
import { ModuleMigrationService } from '../packages/modules/module_migration';
import { ErrorReporting } from '../packages/utils/error_reporting';
import { GlobalConfigService } from '../packages/config/global_config_service';

export default class Tutorial extends Command {
  static description = 'Migrate deployment meta data from other deployers to hardhat-ignition state file.';
  private prompter: IPrompter;
  private errorReporting: ErrorReporting;

  static flags = {
    help: flags.help({char: 'h'}),
    from: flags.enum({
      name: 'from',
      description: 'Deployment package name',
      options: [Migration.truffle, Migration.hardhatDeploy],
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
      process.env.DEBUG = '*';
    }

    const globalConfigService = new GlobalConfigService();
    await globalConfigService.mustConfirmConsent();
    this.errorReporting = new ErrorReporting(globalConfigService);

    let moduleName = flags.moduleName;
    if (!moduleName) {
      cli.info(chalk.gray('Module is encapsulation for smart contract infrastructure, in order to migrate build and artifacts files please provide module name.'));
      moduleName = await cli.prompt('Module name');
    }

    const currentPath = process.cwd();
    this.prompter = new StreamlinedPrompter();
    const moduleState = new FileSystemModuleState(currentPath);
    const stateMigrationService = new StateMigrationService(moduleState, flags.from);
    const moduleMigrationService = new ModuleMigrationService(currentPath);

    await command.migrate(stateMigrationService, moduleMigrationService, moduleName);
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
