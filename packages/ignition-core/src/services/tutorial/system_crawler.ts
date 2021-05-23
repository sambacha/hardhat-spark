import { Artifact } from "hardhat/types";
import * as path from "path";

import { JsonFragment, JsonFragmentType } from "../types/artifacts/abi";
import { searchBuilds, searchModuleFilesName } from "../utils/sol_files";

export class SystemCrawlingService {
  private static filterArtifactsByName(
    artifacts: Artifact[],
    contractName: string
  ): Artifact | undefined {
    for (const artifact of artifacts) {
      if (artifact.contractName == contractName) {
        return artifact;
      }
    }

    return undefined;
  }

  private static filterArtifacts(artifacts: Artifact[]): Artifact[] {
    const filteredArtifacts: Artifact[] = [];

    for (const artifact of artifacts) {
      if (artifact.bytecode && artifact.contractName) {
        filteredArtifacts.push(artifact);
      }
    }

    return filteredArtifacts;
  }
  private readonly currentPath: string;

  constructor(currentPath: string, folderName: string) {
    this.currentPath = path.resolve(currentPath, folderName);
  }

  public crawlDeploymentModule(): string[] {
    return searchModuleFilesName(this.currentPath, []);
  }

  public crawlSolidityContractsNames(): string[] {
    const contracts: string[] = [];

    const artifacts = searchBuilds(this.currentPath, []) as Artifact[];
    const contractArtifacts = SystemCrawlingService.filterArtifacts(artifacts);

    for (const artifacts of contractArtifacts) {
      contracts.push(artifacts.contractName);
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

    const artifacts = searchBuilds(this.currentPath, []) as Artifact[];
    const contractBuilds = SystemCrawlingService.filterArtifactsByName(
      artifacts,
      contractName
    );

    if (!contractBuilds) {
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
