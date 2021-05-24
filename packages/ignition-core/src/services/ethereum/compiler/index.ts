import { JsonFragment } from "../../types/artifacts/abi";
import { LinkReferences } from "../../types/artifacts/libraries";

export interface ICompiler {
  extractBytecode(contractNames: string[]): { [name: string]: string };
  extractContractInterface(
    contractNames: string[]
  ): { [p: string]: JsonFragment[] };
  extractContractLibraries(contractNames: string[]): LinkReferences;
}
