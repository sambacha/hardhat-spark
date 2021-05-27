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
  private _deploymentFileRepo: DeploymentFileRepo;

  private _moduleName: string | undefined;
  private readonly _contracts: {
    [bindingName: string]: {
      constructorArgs: any[];
    };
  };
  private readonly _templates: {
    [bindingName: string]: {
      contractName: string;
    };
  };
  private readonly _events: {
    [eventName: string]: {
      bindingName: string;
      contractFunction: string;
      contractFunctionArgs: any[];
    };
  };

  constructor(deploymentFileRepo: DeploymentFileRepo) {
    this._deploymentFileRepo = deploymentFileRepo;

    this._contracts = {};
    this._templates = {};
    this._events = {};
  }

  public setDeploymentPath(deploymentPath: string, deploymentFile: string) {
    this._deploymentFileRepo.setDeploymentPath(deploymentPath, deploymentFile);
  }

  public initEmptyModule(moduleName: string) {
    this._moduleName = moduleName;

    const fileContent = this._generateModuleFile();

    this._deploymentFileRepo.storeNewDeployment(fileContent);
  }

  public newContract(
    contractName: string,
    bindingName: string,
    ...args: any[]
  ) {
    if (contractName !== bindingName) {
      this._templates[bindingName] = {
        contractName,
      };
    }

    this._contracts[bindingName] = {
      constructorArgs: args,
    };

    const fileContent = this._generateModuleFile();

    this._deploymentFileRepo.storeNewDeployment(fileContent);
  }

  public newContractInvocation(
    contractName: string,
    bindingName: string,
    functionName: string,
    ...functionArgs: any[]
  ) {
    const eventName = `${EventType.AfterDeployEvent}${contractName}${functionName}`;
    this._events[eventName] = {
      bindingName,
      contractFunction: functionName,
      contractFunctionArgs: functionArgs,
    };

    const fileContent = this._generateModuleFile();

    this._deploymentFileRepo.storeNewDeployment(fileContent);
  }

  private _generateModuleFile() {
    let fileContent = `import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';

/*
${MODULE_NAME_DESC}
*/
export const ${this._moduleName} = buildModule('${this._moduleName}', async (m: ModuleBuilder) => {`;

    if (Object.keys(this._templates).length > 0) {
      fileContent += `
  /*
  ${TEMPLATE_DESC}
  */
`;
    }

    for (const proto of Object.keys(this._templates)) {
      fileContent += `  m.contractTemplate('${this._templates[proto].contractName}');
`;
    }
    fileContent += `
  /*
  ${CONTRACT_DESC}
  */
`;

    for (const contractBindingName of Object.keys(this._contracts)) {
      const args = this._contracts[contractBindingName]?.constructorArgs.join(
        ", "
      );
      if (checkIfExist(this._templates[contractBindingName])) {
        if (args !== "") {
          fileContent += `  const ${contractBindingName} = m.bindTemplate('${contractBindingName}', '${this._templates[contractBindingName].contractName}', ${args});
`;
          continue;
        }

        fileContent += `  const ${contractBindingName} = m.bindTemplate('${contractBindingName}', '${this._templates[contractBindingName].contractName}');
`;
        continue;
      }

      if (args !== "") {
        fileContent += `  const ${contractBindingName} = m.contract('${contractBindingName}', ${args});
`;
        continue;
      }

      fileContent += `  const ${contractBindingName} = m.contract('${contractBindingName}');
`;
    }

    fileContent += `
`;

    for (const [eventName, event] of Object.entries(this._events)) {
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
