import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import {
  CommandParsingFailed,
  NoDeploymentModuleError,
  WrongDeploymentPathForNetwork
} from '../services/types/errors';
import path from 'path';
import { ModuleTypings } from '../services/modules/typings';
import * as command from '../index';
import ConfigService from '../services/config/service';
import chalk from 'chalk';
import { ILogging } from '../services/utils/logging';
import { StreamlinedPrompter } from '../services/utils/logging/prompter';
import { checkIfExist } from '../services/utils/util';
import fs from 'fs';
import * as inquirer from 'inquirer';
import { DEFAULT_DEPLOYMENT_FOLDER } from '../services/utils/constants';
import { SystemCrawlingService } from '../services/tutorial/system_crawler';
import { GlobalConfigService } from '../services/config/global_config_service';
import { AnalyticsService } from '../services/utils/analytics/analytics_service';
import { errorHandling } from '../index';
import { IAnalyticsService } from '../services/utils/analytics';
import * as net from 'net';

export default class GenTypes extends Command {
  static description = 'It\'ll generate .d.ts file for written deployment modules for better type hinting.';
  private prompter: ILogging | undefined;
  private analyticsService: IAnalyticsService | undefined;

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
        description: 'Path to the hardhat-ignition.config.js script, default is same as current path.',
      }
    ),
  };

  static args = [{name: 'module_file_path'}];

  async run() {
    let args;
    let flags;
    try {
      const commandOutput = this.parse(GenTypes);
      args = commandOutput.args;
      flags = commandOutput.flags;
    } catch (err) {
      throw new CommandParsingFailed(err);
    }    if (flags.debug) {
      cli.config.outputLevel = 'debug';
      process.env.DEBUG = '*';
    }

    const globalConfigService = new GlobalConfigService();
    await globalConfigService.mustConfirmConsent();
    this.analyticsService = new AnalyticsService(globalConfigService);

    const systemCrawlingService = new SystemCrawlingService(process.cwd(), DEFAULT_DEPLOYMENT_FOLDER);
    const deploymentModules = systemCrawlingService.crawlDeploymentModule();

    const currentPath = process.cwd();
    let filePath = args.module_file_path as string;
    this.prompter = new StreamlinedPrompter();

    const typings = new ModuleTypings();

    const configService = new ConfigService();
    const config = await configService.initializeIgnitionConfig(process.cwd(), flags.configScriptPath);

    if (
      !checkIfExist(config.networks) &&
      (filePath == '' || !checkIfExist(filePath))
    ) {
      const deploymentFileName = (await inquirer.prompt([{
        name: 'deploymentFileName',
        message: 'Deployments file:',
        type: 'list',
        choices: deploymentModules.map((v) => {
          return {
            name: v
          };
        }),
      }])).deploymentFileName;
      try {
        filePath = path.resolve(DEFAULT_DEPLOYMENT_FOLDER, deploymentFileName);
      } catch (e) {
        throw new NoDeploymentModuleError();
      }

      const resolvedPath = path.resolve(currentPath, filePath);
      await command.genTypes(resolvedPath, config, typings, configService, this.prompter, this.analyticsService);
      return;
    } else if (!checkIfExist(config.networks)) {
      const resolvedPath = path.resolve(currentPath, filePath);
      await command.genTypes(resolvedPath, config, typings, configService, this.prompter, this.analyticsService);
      return;
    }

    for (const [networkName, network] of Object.entries(config.networks || {})) {
      if (
        network.deploymentFilePath
      ) {
        filePath = network.deploymentFilePath;
        if (!fs.existsSync(filePath)) {
          throw new WrongDeploymentPathForNetwork(networkName, filePath);
        }

        const resolvedPath = path.resolve(currentPath, filePath);
        await command.genTypes(resolvedPath, config, typings, configService, this.prompter, this.analyticsService);
      } else {
        cli.info(`Deployment script path is missing for network ${networkName}`);
      }
    }
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
