import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import {
  CliError,
  PathNotProvided,
  UserError, WrongDeploymentPathForNetwork
} from '../packages/types/errors';
import path from 'path';
import { ModuleTypings } from '../packages/modules/typings';
import * as command from '../index';
import ConfigService from '../packages/config/service';
import chalk from 'chalk';
import { IPrompter } from '../packages/utils/logging';
import { StreamlinedPrompter } from '../packages/utils/logging/prompter';
import { checkIfExist } from '../packages/utils/util';
import fs from 'fs';
import * as inquirer from 'inquirer';
import { DEFAULT_DEPLOYMENT_FOLDER } from '../packages/utils/constants';
import { SystemCrawlingService } from '../packages/tutorial/system_crawler';

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
        description: 'Path to the hardhat-ignition.config.js script, default is same as current path.',
      }
    ),
  };

  static args = [{name: 'module_file_path'}];

  async run() {
    const {args, flags} = this.parse(GenTypes);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
      process.env.DEBUG = '*';
    }

    const systemCrawlingService = new SystemCrawlingService(process.cwd(), DEFAULT_DEPLOYMENT_FOLDER);
    const deploymentModules = systemCrawlingService.crawlDeploymentModule();

    const currentPath = process.cwd();
    let filePath = args.module_file_path as string;
    if (filePath == '') {
      throw new PathNotProvided('Path argument missing from command. \nPlease use --help to better understand usage of this command');
    }

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
        throw new UserError('Their is not deployment module provided.\n   Use --help for more information.');
      }

      const resolvedPath = path.resolve(currentPath, filePath);
      await command.genTypes(resolvedPath, config, typings, configService, this.prompter);
      return;
    } else if (!checkIfExist(config.networks)) {
      const resolvedPath = path.resolve(currentPath, filePath);
      await command.genTypes(resolvedPath, config, typings, configService, this.prompter);
      return;
    }

    for (const [networkName, network] of Object.entries(config.networks)) {
      if (
        checkIfExist(network.deploymentFilePath)
      ) {
        filePath = network.deploymentFilePath;
        if (!fs.existsSync(filePath)) {
          throw new WrongDeploymentPathForNetwork(networkName);
        }

        const resolvedPath = path.resolve(currentPath, filePath);
        await command.genTypes(resolvedPath, config, typings, configService, this.prompter);
      } else {
        cli.info(`Deployment script path is missing for network ${networkName}`);
      }
    }
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
  }
}
