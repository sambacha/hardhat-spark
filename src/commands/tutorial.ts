import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as command from '../index';
import { UserError } from '../packages/types/errors';
import chalk from 'chalk';
import { TutorialService } from '../packages/tutorial/tutorial_service';
import { DeploymentFileGenerator } from '../packages/tutorial/deployment_file_gen';
import { DeploymentFileRepo } from '../packages/tutorial/deployment_file_repo';
import { StreamlinedPrompter } from '../packages/utils/promter/prompter';

export default class Tutorial extends Command {
  static description = 'Easiest way to get started with mortar, create couple contracts and start deploying.';
  private prompter: StreamlinedPrompter;

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
    }

    this.prompter = new StreamlinedPrompter();
    const deploymentFileRepo = new DeploymentFileRepo();
    const deploymentFileGenerator = new DeploymentFileGenerator(deploymentFileRepo);
    const tutorialService = new TutorialService(deploymentFileGenerator);

    await command.tutorial(tutorialService);
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
