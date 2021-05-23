import { EventType } from "../../interfaces/hardhat_ignition";
import { checkIfExist } from "../utils/util";

import { DeploymentFileRepo } from "./deployment_file_repo";
import {
  CONTRACT_DESC,
  EVENT_DESC,
  MODULE_NAME_DESC,
  TEMPLATE_DESC,
} from "./tutorial_desc";

export class DeploymentFileGenerator {
  private deploymentFileRepo: DeploymentFileRepo;

  private moduleName: string | undefined;
  private readonly contracts: {
    [bindingName: string]: {
      constructorArgs: any[];
    };
  };
  private readonly templates: {
    [bindingName: string]: {
      contractName: string;
    };
  };
  private readonly events: {
    [eventName: string]: {
      bindingName: string;
      contractFunction: string;
      contractFunctionArgs: any[];
    };
  };

  constructor(deploymentFileRepo: DeploymentFileRepo) {
    this.deploymentFileRepo = deploymentFileRepo;

    this.contracts = {};
    this.templates = {};
    this.events = {};
  }

  public setDeploymentPath(deploymentPath: string, deploymentFile: string) {
    this.deploymentFileRepo.setDeploymentPath(deploymentPath, deploymentFile);
  }

  public initEmptyModule(moduleName: string) {
    this.moduleName = moduleName;

    const fileContent = this.generateModuleFile();

    this.deploymentFileRepo.storeNewDeployment(fileContent);
  }

  public newContract(
    contractName: string,
    bindingName: string,
    ...args: any[]
  ) {
    if (contractName != bindingName) {
      this.templates[bindingName] = {
        contractName,
      };
    }

    this.contracts[bindingName] = {
      constructorArgs: args,
    };

    const fileContent = this.generateModuleFile();

    this.deploymentFileRepo.storeNewDeployment(fileContent);
  }

  public newContractInvocation(
    contractName: string,
    bindingName: string,
    functionName: string,
    ...functionArgs: any[]
  ) {
    const eventName = `${EventType.AfterDeployEvent}${contractName}${functionName}`;
    this.events[eventName] = {
      bindingName,
      contractFunction: functionName,
      contractFunctionArgs: functionArgs,
    };

    const fileContent = this.generateModuleFile();

    this.deploymentFileRepo.storeNewDeployment(fileContent);
  }

  private generateModuleFile() {
    let fileContent = `import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';

/*
${MODULE_NAME_DESC}
*/
export const ${this.moduleName} = buildModule('${this.moduleName}', async (m: ModuleBuilder) => {`;

    if (Object.keys(this.templates).length > 0) {
      fileContent += `
  /*
  ${TEMPLATE_DESC}
  */
`;
    }

    for (const proto of Object.keys(this.templates)) {
      fileContent += `  m.contractTemplate('${this.templates[proto].contractName}');
`;
    }
    fileContent += `
  /*
  ${CONTRACT_DESC}
  */
`;

    for (const contractBindingName of Object.keys(this.contracts)) {
      const args = this.contracts[contractBindingName]?.constructorArgs.join(
        ", "
      );
      if (checkIfExist(this.templates[contractBindingName])) {
        if (args) {
          fileContent += `  const ${contractBindingName} = m.bindTemplate('${contractBindingName}', '${this.templates[contractBindingName].contractName}', ${args});
`;
          continue;
        }

        fileContent += `  const ${contractBindingName} = m.bindTemplate('${contractBindingName}', '${this.templates[contractBindingName].contractName}');
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
      const functionArgs = event.contractFunctionArgs.join(", ");
      fileContent += `
  /*
  ${EVENT_DESC}
  */
  const ${eventName} = ${event.bindingName}.afterDeploy(m, '${eventName}', async () => {
      await ${event.bindingName}.deployed().${event.contractFunction}(${functionArgs});
  });
`;
    }

    fileContent += `});
`;

    return fileContent;
  }
}
