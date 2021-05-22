import * as path from 'path';
import { cli } from 'cli-ux';
import chalk from 'chalk';
import {
  CONSTRUCTOR_ARGS,
  CONTRACT_DUPLICATES,
  CONTRACT_NAME_DESC,
} from './tutorial_desc';
import { checkIfExist } from '../utils/util';
import { DeploymentFileGenerator } from './deployment_file_gen';
import { SystemCrawlingService } from './system_crawler';
import * as inquirer from 'inquirer';

export const DEPLOYMENT_FOLDER = './deployment';
export const DEPLOYMENT_FILE = './tutorial.module.ts';

type ContractName = string;

export class TutorialService {
  private readonly contractNames: { [bindingName: string]: ContractName };

  private deploymentFileGenerator: DeploymentFileGenerator;
  private systemCrawlingService: SystemCrawlingService;

  constructor(
    deploymentFileGenerator: DeploymentFileGenerator,
    systemCrawlingService: SystemCrawlingService
  ) {
    this.deploymentFileGenerator = deploymentFileGenerator;
    this.systemCrawlingService = systemCrawlingService;
    this.contractNames = {};
  }

  setDeploymentPath(rootPath: string) {
    this.deploymentFileGenerator.setDeploymentPath(
      path.resolve(rootPath, DEPLOYMENT_FOLDER),
      DEPLOYMENT_FILE
    );
  }

  setModuleName(moduleName: string) {
    this.deploymentFileGenerator.initEmptyModule(moduleName);
  }

  async start() {
    // crawl for all contracts in
    const contracts = this.systemCrawlingService.crawlSolidityContractsNames();

    while (true) {
      let yes = await cli.confirm(
        'Do you want to deploy a smart contract?(yes/no)'
      );
      if (!yes) {
        break;
      }

      cli.info(chalk.gray(CONTRACT_NAME_DESC));
      const contractName = (
        await inquirer.prompt([
          {
            name: 'contractName',
            message: 'Contract name:',
            type: 'list',
            choices: contracts.map((v) => {
              return {
                name: v,
              };
            }),
          },
        ])
      ).contractName;

      let bindingName = contractName;
      if (checkIfExist(this.contractNames[contractName])) {
        bindingName = await cli.prompt(CONTRACT_DUPLICATES);
        this.contractNames[bindingName] = contractName;
      }
      this.contractNames[contractName] = contractName;

      let constructorArgs = await cli.prompt(CONSTRUCTOR_ARGS, {
        required: false,
      });
      constructorArgs = constructorArgs.split(',');

      this.deploymentFileGenerator.newContract(
        contractName,
        bindingName,
        ...constructorArgs
      );

      yes = await cli.confirm(
        'Do you wish to execute any contract function after contract deployment?(yes/no)'
      );
      await this.handleContractFuncExecution(contractName, bindingName, yes);
    }

    cli.info(
      `Successfully generated module deployment! Look under ${path.resolve(
        DEPLOYMENT_FOLDER,
        DEPLOYMENT_FILE
      )}`
    );
  }

  async handleContractFuncExecution(
    contractName: string,
    bindingName: string,
    yes: boolean
  ): Promise<boolean> {
    if (!yes) {
      return false;
    }

    while (true) {
      if (yes) {
        const contractFunctionNames = await this.systemCrawlingService.crawlSolidityFunctionsOfContract(
          contractName
        );
        if (contractFunctionNames && contractFunctionNames.length > 0) {
          const functionName = (
            await inquirer.prompt([
              {
                name: 'functionName',
                message: 'Function name:',
                type: 'list',
                choices: contractFunctionNames.map((v) => {
                  return {
                    name: v.name,
                  };
                }),
              },
            ])
          ).functionName;

          let functionArgs = await cli.prompt(`Contract function arguments?`, {
            required: false,
          });
          functionArgs = functionArgs?.split(',');

          this.deploymentFileGenerator.newContractInvocation(
            contractName,
            bindingName,
            functionName,
            functionArgs
          );
        } else {
          cli.info(
            'Contract dont have any callable function... please continue'
          );
        }

        const yes = await cli.confirm(
          'Any more contract functions to be executed?(yes/no)'
        );
        if (
          !(await this.handleContractFuncExecution(
            contractName,
            bindingName,
            yes
          ))
        ) {
          break;
        }
      }
    }

    return false;
  }
}
