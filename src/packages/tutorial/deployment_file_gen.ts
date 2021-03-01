import { DeploymentFileRepo } from './deployment_file_repo';
import { CONTRACT_DESC, EVENT_DESC, MODULE_NAME_DESC, PROTOTYPE_DESC } from './tutorial_desc';
import { checkIfExist } from '../utils/util';
import { EventType } from '../../interfaces/mortar';

export class DeploymentFileGenerator {
  private deploymentFileRepo: DeploymentFileRepo;

  private moduleName: string;
  private readonly contracts: {
    [bindingName: string]: {
      constructorArgs: any[],
    }
  };
  private readonly prototypes: {
    [bindingName: string]: {
      contractName: string,
    }
  };
  private readonly events: {
    [eventName: string]: {
      bindingName: string,
      contractFunction: string,
      contractFunctionArgs: any[],
    }
  };

  constructor(deploymentFileRepo: DeploymentFileRepo) {
    this.deploymentFileRepo = deploymentFileRepo;

    this.contracts = {};
    this.prototypes = {};
    this.events = {};
  }

  setDeploymentPath(deploymentPath: string, deploymentFile: string) {
    this.deploymentFileRepo.setDeploymentPath(deploymentPath, deploymentFile);
  }

  initEmptyModule(moduleName: string) {
    this.moduleName = moduleName;

    const fileContent = this.generateModuleFile();

    this.deploymentFileRepo.storeNewDeployment(fileContent);
  }

  newContract(contractName: string, bindingName: string, ...args: any[]) {
    if (contractName != bindingName) {
      this.prototypes[bindingName] = {
        contractName: contractName,
      };
    }

    this.contracts[bindingName] = {
      constructorArgs: args
    };

    const fileContent = this.generateModuleFile();

    this.deploymentFileRepo.storeNewDeployment(fileContent);
  }

  newContractInvocation(contractName: string, bindingName: string, functionName: string, ...functionArgs: any[]) {
    const eventName = `${EventType.AfterDeploymentEvent}${contractName}${functionName}`;
    this.events[eventName] = {
      bindingName: bindingName,
      contractFunction: functionName,
      contractFunctionArgs: functionArgs,
    };

    const fileContent = this.generateModuleFile();

    this.deploymentFileRepo.storeNewDeployment(fileContent);
  }

  private generateModuleFile() {
    let fileContent = `import { buildModule, ModuleBuilder } from '@tenderly/mortar';

/*
${MODULE_NAME_DESC}
*/
export const ${this.moduleName} = buildModule('${this.moduleName}', async (m: ModuleBuilder) => {`;

    if (Object.keys(this.prototypes).length > 0) {
      fileContent += `
  /*
  ${PROTOTYPE_DESC}
  */
`;
    }

    for (const proto of Object.keys(this.prototypes)) {
      fileContent += `  m.prototype('${this.prototypes[proto].contractName}');
`;
    }
    fileContent += `
  /*
  ${CONTRACT_DESC}
  */
`;

    for (const contractBindingName of Object.keys(this.contracts)) {
      const args = this.contracts[contractBindingName]?.constructorArgs.join(', ');
      if (checkIfExist(this.prototypes[contractBindingName])) {
        if (args) {
          fileContent += `  const ${contractBindingName} = m.bindPrototype('${contractBindingName}', '${this.prototypes[contractBindingName].contractName}', ${args});
`;
          continue;
        }

        fileContent += `  const ${contractBindingName} = m.bindPrototype('${contractBindingName}', '${this.prototypes[contractBindingName].contractName}');
`;
        continue;
      }

      if (args) {
        fileContent += `  const ${contractBindingName} = m.contract('${contractBindingName}', ${args});
`;
        continue;
      }

      fileContent += `  const ${contractBindingName} = m.contract('${contractBindingName}');
`;
    }

    fileContent += `
`;

    for (const [eventName, event] of Object.entries(this.events)) {
      const functionArgs = event.contractFunctionArgs.join(', ');
      fileContent += `
  /*
  ${EVENT_DESC}
  */
  const ${eventName} = ${event.bindingName}.afterDeploy(m, '${eventName}', async () => {
      await ${event.bindingName}.instance().${event.contractFunction}(${functionArgs});
  });
`;
    }

    fileContent += `});
`;

    return fileContent;
  }
}
