import {Compiler} from "./index";
import {execSync} from "child_process";
import * as path from "path";
import {parseFiles} from "../../utils/files";
import {JsonFragment} from "../../types/abi"

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
}
