import { Artifact } from "hardhat/src/types/artifacts";
import * as path from "path";

import { JsonFragment } from "../../types/artifacts/abi";
import { LinkReferences } from "../../types/artifacts/libraries";
import { parseFiles } from "../../utils/files";
import { checkIfExist } from "../../utils/util";

import { IContractDataExtractor } from "./index";

export class HardhatExtractor implements IContractDataExtractor {
  public extractBytecode(contractNames: string[]): { [name: string]: string } {
    try {
      const bytecodes: { [name: string]: string } = {};

      const dir = path.resolve(process.cwd(), "artifacts", "contracts");
      const buildArtifacts = parseFiles(dir, contractNames, []);
      for (const artifact of buildArtifacts) {
        const art = JSON.parse(artifact);

        bytecodes[art.contractName] = art.bytecode;
      }

      return bytecodes;
    } catch (e) {
      return e;
    }
  }

  public extractContractInterface(
    contractNames: string[]
  ): { [p: string]: JsonFragment[] } {
    try {
      const ABIs: { [p: string]: JsonFragment[] } = {};

      const dir = path.resolve(process.cwd(), "artifacts", "contracts");
      const buildArtifacts = parseFiles(dir, contractNames, []);
      for (const artifact of buildArtifacts) {
        const art = JSON.parse(artifact);

        ABIs[art.contractName] = art.abi;
      }

      return ABIs;
    } catch (e) {
      throw e;
    }
  }

  public extractContractLibraries(contractNames: string[]): LinkReferences {
    try {
      const libraries: { [p: string]: any } = {};

      const dir = path.resolve(process.cwd(), "artifacts", "contracts");
      const buildArtifacts = parseFiles(dir, contractNames, []);
      for (const artifact of buildArtifacts) {
        const art = JSON.parse(artifact) as Artifact;

        const contractLibDep: {
          [libraryName: string]: Array<{ length: number; start: number }>;
        } = {};
        if (!checkIfExist(art.linkReferences)) {
          continue;
        }

        for (const [, linkDeps] of Object.entries(art.linkReferences)) {
          for (const [libraryName, librariesOccurrence] of Object.entries(
            linkDeps
          )) {
            contractLibDep[libraryName] = librariesOccurrence;
          }
        }

        libraries[art.contractName] = contractLibDep;
      }

      return libraries;
    } catch (e) {
      throw e;
    }
  }
}
