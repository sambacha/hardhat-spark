import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as command from '../index';
import chalk from 'chalk';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { Migration } from '../packages/types/migration';
import { StateMigrationService } from '../packages/modules/states/state_migration_service';
import { FileSystemModuleState } from '../packages/modules/states/module/file_system';
import { IPrompter } from '../packages/utils/logging';
import { ModuleMigrationService } from '../packages/modules/module_migration';
import { AnalyticsService } from '../packages/utils/analytics/analytics_service';
import { GlobalConfigService } from '../packages/config/global_config_service';
import { errorHandling } from '../index';

export default class Migrate extends Command {
  static description = 'Migrate deployment meta data from other deployers to hardhat-ignition state file.';
  private prompter: IPrompter;
  private analyticsService: AnalyticsService;

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
    const {args, flags} = this.parse(Migrate);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
      process.env.DEBUG = '*';
    }

    const globalConfigService = new GlobalConfigService();
    await globalConfigService.mustConfirmConsent();
    this.analyticsService = new AnalyticsService(globalConfigService);

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

    await command.migrate(stateMigrationService, moduleMigrationService, moduleName, this.analyticsService);
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
