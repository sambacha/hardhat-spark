import { Artifact } from "hardhat/types";
import * as path from "path";

import { JsonFragment, JsonFragmentType } from "../types/artifacts/abi";
import { searchBuilds, searchModuleFilesName } from "../utils/searcher";

export class SystemCrawlingService {
  private static _filterArtifactsByName(
    artifacts: Artifact[],
    contractName: string
  ): Artifact | undefined {
    for (const artifact of artifacts) {
      if (artifact.contractName === contractName) {
        return artifact;
      }
    }

    return undefined;
  }

  private static _filterArtifacts(artifacts: Artifact[]): Artifact[] {
    const filteredArtifacts: Artifact[] = [];

    for (const artifact of artifacts) {
      if (artifact.bytecode !== "" && artifact.contractName !== "") {
        filteredArtifacts.push(artifact);
      }
    }

    return filteredArtifacts;
  }
  private readonly _currentPath: string;

  constructor(currentPath: string, folderName: string) {
    this._currentPath = path.resolve(currentPath, folderName);
  }

  public crawlDeploymentModule(): string[] {
    return searchModuleFilesName(this._currentPath, []);
  }

  public crawlSolidityContractsNames(): string[] {
    const contracts: string[] = [];

    const artifacts = searchBuilds(this._currentPath, []) as Artifact[];
    const contractArtifacts = SystemCrawlingService._filterArtifacts(artifacts);

    for (const contractArtifact of contractArtifacts) {
      contracts.push(contractArtifact.contractName);
    }

    return contracts;
  }

  public crawlSolidityFunctionsOfContract(
    contractName: string
  ):
    | Array<{
        name: string;
        inputs?: JsonFragmentType[];
      }>
    | undefined {
    const functionNames: Array<{
      name: string;
      inputs?: JsonFragmentType[];
    }> = [];

    const artifacts = searchBuilds(this._currentPath, []) as Artifact[];
    const contractBuilds = SystemCrawlingService._filterArtifactsByName(
      artifacts,
      contractName
    );

    if (contractBuilds === undefined) {
      return undefined;
    }

    for (let singleAbiElement of contractBuilds.abi) {
      singleAbiElement = singleAbiElement as JsonFragment;

      if (singleAbiElement?.name) {
        functionNames.push({
          name: singleAbiElement.name,
          inputs: singleAbiElement.inputs,
        });
      }
    }

    return functionNames;
  }
}
