import { Build } from '../../types/migration';
import { checkIfExist } from '../../utils/util';
import { IModuleState, ModuleStateFile } from './module';
import { ContractBindingMetaData, Deployed } from '../../../interfaces/mortar';
import { searchBuilds } from '../../utils/files';

export class StateMigrationService {
  private readonly moduleState: IModuleState;

  constructor(moduleState: IModuleState) {
    this.moduleState = moduleState;
  }

  searchBuild(currentPath: string): Build[] {
    return searchBuilds(currentPath, []) as Build[];
  }

  extractValidBuilds(builds: Build[]) {
    const validBuilds: Build[] = [];
    for (const buildFile of builds) {
      if (
        checkIfExist(buildFile.networks) &&
        Object.entries(buildFile.networks).length > 0
      ) {
        validBuilds.push(buildFile);
      }
    }

    return validBuilds;
  }

  mapBuildsToStateFile(validBuilds: Build[]): { [networkId: string]: ModuleStateFile } {
    const stateObject: { [networkId: string]: ModuleStateFile } = {};

    for (const validBuild of validBuilds) {
      for (const [networkId, metaData] of Object.entries(validBuild.networks)) {
        if (!checkIfExist(stateObject[networkId])) {
          stateObject[networkId] = {};
        }

        const elementName = validBuild.contractName;

        const deployMetaData: Deployed = {
          deploymentSpec: undefined, lastEventName: undefined, logicallyDeployed: undefined, shouldRedeploy: undefined,
          contractAddress: metaData.address
        };

        stateObject[networkId][elementName] = new ContractBindingMetaData(
          validBuild.contractName,
          validBuild.contractName,
          [],
          validBuild.bytecode,
          validBuild.abi,
          undefined,
          undefined,
          deployMetaData
        );
      }
    }

    return stateObject;
  }

  async storeNewStateFiles(moduleName: string, stateFiles: { [networkId: string]: ModuleStateFile }) {
    for (const [networkId, stateFile] of Object.entries(stateFiles)) {
      await this.moduleState.storeStates(+networkId, moduleName, stateFile);
    }
  }
}
