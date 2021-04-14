import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as command from '../index';
import { TutorialService } from '../packages/tutorial/tutorial_service';
import { DeploymentFileGenerator } from '../packages/tutorial/deployment_file_gen';
import { DeploymentFileRepo } from '../packages/tutorial/deployment_file_repo';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { SystemCrawlingService } from '../packages/tutorial/system_crawler';
import { GlobalConfigService } from '../packages/config/global_config_service';
import { AnalyticsService } from '../packages/utils/analytics/analytics_service';
import { errorHandling } from '../index';

const ARTIFACTS_FOLDER = 'artifacts';

export default class Tutorial extends Command {
  static description = 'Easiest way to get started with hardhat-ignition, create couple contracts and start deploying.';
  private prompter: StreamlinedPrompter;
  private analyticsService: AnalyticsService;

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
    this.analyticsService = new AnalyticsService(globalConfigService);

    this.prompter = new StreamlinedPrompter();
    const deploymentFileRepo = new DeploymentFileRepo();
    const deploymentFileGenerator = new DeploymentFileGenerator(deploymentFileRepo);
    const systemCrawlingService = new SystemCrawlingService(process.cwd(), ARTIFACTS_FOLDER);
    const tutorialService = new TutorialService(deploymentFileGenerator, systemCrawlingService);

    await command.tutorial(tutorialService, this.analyticsService);
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
