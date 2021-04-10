import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as command from '../index';
import { CliError, UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { TutorialService } from '../packages/tutorial/tutorial_service';
import { DeploymentFileGenerator } from '../packages/tutorial/deployment_file_gen';
import { DeploymentFileRepo } from '../packages/tutorial/deployment_file_repo';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { SystemCrawlingService } from '../packages/tutorial/system_crawler';
import { GlobalConfigService } from '../packages/config/global_config_service';
import { ErrorReporting } from '../packages/utils/error_reporting';

const ARTIFACTS_FOLDER = 'artifacts';

export default class Tutorial extends Command {
  static description = 'Easiest way to get started with hardhat-ignition, create couple contracts and start deploying.';
  private prompter: StreamlinedPrompter;
  private errorReporting: ErrorReporting;

  static flags = {
    help: flags.help({char: 'h'}),
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

    this.prompter = new StreamlinedPrompter();
    const deploymentFileRepo = new DeploymentFileRepo();
    const deploymentFileGenerator = new DeploymentFileGenerator(deploymentFileRepo);
    const systemCrawlingService = new SystemCrawlingService(process.cwd(), ARTIFACTS_FOLDER);
    const tutorialService = new TutorialService(deploymentFileGenerator, systemCrawlingService);

    await command.tutorial(tutorialService);
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
