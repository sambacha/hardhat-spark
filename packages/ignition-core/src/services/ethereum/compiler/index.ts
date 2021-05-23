import { JsonFragment } from "../../types/artifacts/abi";

export interface ICompiler {
  extractBytecode(contractNames: string[]): { [name: string]: string };
  extractContractInterface(
    contractNames: string[]
  ): { [p: string]: JsonFragment[] };
}
