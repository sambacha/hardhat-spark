import {Compiler} from "./index";
import {execSync} from "child_process";
import * as path from "path";
import {parseFiles} from "../../utils/files";
import {JsonFragment} from "../../types/artifacts/abi";
import {Artifact} from "hardhat/src/types/artifacts";
import {LinkReferences} from "../../types/artifacts/libraries";

export class HardhatCompiler extends Compiler {
  compile(): void {
    execSync('npx hardhat compile')
  }

  extractBytecode(contractNames: string[]): { [name: string]: string } {
    try {
      let bytecodes: { [name: string]: string } = {}

      const dir = path.resolve(process.cwd(), "artifacts", "contracts")
      const buildArtifacts = parseFiles(dir, contractNames, [])
      for (let artifact of buildArtifacts) {
        const art = JSON.parse(artifact)

        bytecodes[art.contractName] = art.bytecode
      }

      return bytecodes
    } catch (e) {
      return e
    }
  }

  extractContractInterface(contractNames: string[]): { [p: string]: JsonFragment[] } {
    try {
      let ABIs: { [p: string]: JsonFragment[] } = {}

      const dir = path.resolve(process.cwd(), "artifacts", "contracts")
      const buildArtifacts = parseFiles(dir, contractNames, [])
      for (let artifact of buildArtifacts) {
        const art = JSON.parse(artifact)

        ABIs[art.contractName] = art.abi
      }

      return ABIs
    } catch (e) {
      throw e
    }
  }

  extractContractLibraries(contractNames: string[]): LinkReferences {
    try {
      let libraries: { [p: string]: any } = {}

      const dir = path.resolve(process.cwd(), "artifacts", "contracts")
      const buildArtifacts = parseFiles(dir, contractNames, [])
      for (let artifact of buildArtifacts) {
        const art = JSON.parse(artifact) as Artifact

        let contractLibDep: {[libraryName: string]: Array<{ length: number; start: number }>} = {}
        for (let [, linkDeps] of Object.entries(art.linkReferences)) {
          for (let [libraryName, librariesOccurrence] of Object.entries(linkDeps)) {
            contractLibDep[libraryName] = librariesOccurrence
          }
        }

        libraries[art.contractName] = contractLibDep
      }

      return libraries
    } catch (e) {
      throw e
    }
  }
}
