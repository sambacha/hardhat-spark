import {JsonFragment} from "../../types/abi";

export abstract class Compiler {
  abstract compile(): void
  abstract extractBytecode(contractNames: string[]): { [name: string]: string }
  abstract extractContractInterface(contractNames: string[]): { [p: string]: JsonFragment[] }
}
