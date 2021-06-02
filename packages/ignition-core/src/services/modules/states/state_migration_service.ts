import path from "path";

import {
  ContractBindingMetaData,
  Deployed,
  TxData,
} from "../../../interfaces/hardhat_ignition";
import { CliError } from "../../types/errors";
import {
  Build,
  HardhatBuild,
  Migration,
  TruffleBuild,
} from "../../types/migration";
import { ModuleStateFile } from "../../types/module";
import { searchBuilds, searchBuildsAndNetworks } from "../../utils/searcher";
import { checkIfExist } from "../../utils/util";

import { IModuleState } from "./module";

const TRUFFLE_BUILD_DIR_NAME = "build";
const HARDHAT_DEPLOYMENTS_DIR_NAME = "deployments";

export class StateMigrationService {
  private readonly _moduleState: IModuleState;
  private readonly _stateMigrationType: Migration;
  private readonly _artifactsPath: string;

  constructor(moduleState: IModuleState, stateMigrationType: Migration) {
    this._moduleState = moduleState;
    this._stateMigrationType = stateMigrationType;

    switch (this._stateMigrationType) {
      case Migration.truffle:
        this._artifactsPath = path.resolve(
          process.cwd(),
          TRUFFLE_BUILD_DIR_NAME
        );
        break;
      case Migration.hardhatDeploy:
        this._artifactsPath = path.resolve(
          process.cwd(),
          HARDHAT_DEPLOYMENTS_DIR_NAME
        );
        break;
    }
  }

  public searchBuild(): Build[] {
    switch (this._stateMigrationType) {
      case Migration.truffle:
        return searchBuilds(this._artifactsPath, []) as TruffleBuild[];
      case Migration.hardhatDeploy:
        return searchBuildsAndNetworks(
          this._artifactsPath,
          []
        ) as HardhatBuild[];
      default:
        throw new CliError("Migration type not found, please check.");
    }
  }

  public extractValidBuilds(builds: Build[]): Build[] {
    switch (this._stateMigrationType) {
      case Migration.truffle: {
        const validBuilds: TruffleBuild[] = [];
        for (let buildFile of builds) {
          buildFile = buildFile as TruffleBuild;
          if (
            checkIfExist(buildFile.networks) &&
            Object.entries(buildFile.networks).length > 0
          ) {
            validBuilds.push(buildFile);
          }
        }

        return validBuilds;
      }
      case Migration.hardhatDeploy: {
        const validBuilds: HardhatBuild[] = [];
        for (let buildFile of builds) {
          buildFile = buildFile as HardhatBuild;
          if (
            checkIfExist(buildFile.address) &&
            checkIfExist(buildFile.transactionHash) &&
            checkIfExist(buildFile.receipt)
          ) {
            validBuilds.push(buildFile);
          }
        }

        return validBuilds;
      }
    }
  }

  public mapBuildsToStateFile(
    validBuilds: Build[]
  ): { [networkId: string]: ModuleStateFile } {
    switch (this._stateMigrationType) {
      case Migration.truffle: {
        const stateObject: { [networkId: string]: ModuleStateFile } = {};

        for (let validBuild of validBuilds) {
          validBuild = validBuild as TruffleBuild;
          for (const [networkId, metaData] of Object.entries(
            validBuild.networks
          )) {
            if (!checkIfExist(stateObject[networkId])) {
              stateObject[networkId] = {};
            }

            const elementName = validBuild.contractName;

            const deployMetaData: Deployed = {
              deploymentSpec: undefined,
              lastEventName: undefined,
              logicallyDeployed: undefined,
              shouldRedeploy: undefined,
              contractAddress: metaData.address,
            };

            stateObject[networkId][elementName] = new ContractBindingMetaData(
              validBuild.contractName,
              validBuild.contractName,
              [],
              validBuild.bytecode,
              validBuild.abi,
              undefined, // @TODO check if we can surface this data
              undefined,
              undefined,
              deployMetaData
            );
          }
        }

        return stateObject;
      }
      case Migration.hardhatDeploy: {
        const stateObject: { [networkId: string]: ModuleStateFile } = {};

        for (let validBuild of validBuilds) {
          validBuild = validBuild as HardhatBuild;

          const elementName = validBuild.contractName;

          const deployMetaData: Deployed = {
            deploymentSpec: undefined,
            lastEventName: undefined,
            logicallyDeployed: undefined,
            shouldRedeploy: undefined,
            contractAddress: validBuild.address,
          };

          if (!checkIfExist(stateObject[validBuild.networkId])) {
            stateObject[validBuild.networkId] = {};
          }

          const txData: TxData = {
            from: validBuild.receipt.from,
          };
          stateObject[validBuild.networkId][
            elementName
          ] = new ContractBindingMetaData(
            validBuild.contractName,
            validBuild.contractName,
            validBuild.args,
            validBuild.bytecode,
            validBuild.abi,
            undefined, // @TODO check if we can surface this data
            undefined,
            {
              output: validBuild.receipt,
              input: txData,
            },
            deployMetaData
          );
        }

        return stateObject;
      }
    }
  }

  public async storeNewStateFiles(
    moduleName: string,
    stateFiles: { [networkId: string]: ModuleStateFile }
  ) {
    for (const [networkId, stateFile] of Object.entries(stateFiles)) {
      await this._moduleState.storeStates(networkId, moduleName, stateFile);
    }
  }
}
