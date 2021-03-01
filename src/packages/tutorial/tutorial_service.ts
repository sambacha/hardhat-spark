import * as path from 'path';
import { cli } from 'cli-ux';
import chalk from 'chalk';
import { CONSTRUCTOR_ARGS, CONTRACT_DUPLICATES, CONTRACT_NAME_DESC } from './tutorial_desc';
import { checkIfExist } from '../utils/util';
import { DeploymentFileGenerator } from './deployment_file_gen';

export const DEPLOYMENT_FOLDER = './deployment';
export const DEPLOYMENT_FILE = './tutorial.module.ts';

type ContractName = string;

export class TutorialService {
  private moduleName: string;

  private readonly contractNames: { [bindingName: string]: ContractName };

  private deploymentFileGenerator: DeploymentFileGenerator;

  constructor(deploymentFileGenerator: DeploymentFileGenerator) {
    this.deploymentFileGenerator = deploymentFileGenerator;
    this.contractNames = {};
  }

  setDeploymentPath(rootPath: string) {
    this.deploymentFileGenerator.setDeploymentPath(path.resolve(rootPath, DEPLOYMENT_FOLDER), DEPLOYMENT_FILE);
  }

  setModuleName(moduleName: string) {
    this.moduleName = moduleName;

    this.deploymentFileGenerator.initEmptyModule(moduleName);
  }

  async start() {
    while (true) {
      let yes = await cli.confirm('Do you want to deploy a smart contract?(yes/no)');
      if (!yes) {
        break;
      }
      cli.info(chalk.gray(CONTRACT_NAME_DESC));
      const contractName = await cli.prompt('Contract name?');
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

      this.deploymentFileGenerator.newContract(contractName, bindingName, ...constructorArgs);

      yes = await cli.confirm('Do you wish to execute any contract function after contract deployment?(yes/no)');
      await this.handleContractFuncExecution(contractName, bindingName, yes);
    }

    cli.info(`Successfully generated module deployment! Look under ${path.resolve(DEPLOYMENT_FOLDER, DEPLOYMENT_FILE)}`);
  }

  async handleContractFuncExecution(contractName: string, bindingName: string, yes: boolean): Promise<boolean> {
    if (!yes) {
      return false;
    }

    while (true) {
      if (yes) {
        const functionName = await cli.prompt('Contract function name?');
        let functionArgs = await cli.prompt('Contract function arguments?', {
          required: false,
        });
        functionArgs = functionArgs?.split(',');

        this.deploymentFileGenerator.newContractInvocation(contractName, bindingName, functionName, functionArgs);

        const yes = await cli.confirm('Any more contract functions to be executed?(yes/no)');
        if (!await this.handleContractFuncExecution(contractName, bindingName, yes)) {
          break;
        }
      }
    }
  }
}
