export abstract class Compiler {
  abstract compile(): void
  abstract extractBytecode(contractNames: string[]): { [name: string]: string }
}
