import { JsonFragment } from '../../types/artifacts/abi';

export abstract class Compiler {
  abstract compile(): void;
  abstract extractBytecode(contractNames: string[]): { [name: string]: string };
  abstract extractContractInterface(contractNames: string[]): { [p: string]: JsonFragment[] };
}
