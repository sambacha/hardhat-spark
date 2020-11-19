import {Compiler} from "./index";
import {execSync} from "child_process";
import * as path from "path";
import {parseFiles} from "../../utils/files";


export class HardhatCompiler extends Compiler {
  compile(): void {
    execSync('npx hardhat compile')
  }

  extractBytecode(contractNames: string[]): { [name: string]: string } {
    let bytecodes: { [name: string]: string } = {}

    const dir = path.resolve(process.cwd(), "artifacts", "contracts")
    const buildArtifacts = parseFiles(dir, contractNames, [])
    for (let artifact of buildArtifacts) {
      const art = JSON.parse(artifact)

      bytecodes[art.contractName] = art.bytecode
    }

    return bytecodes
  }
}
