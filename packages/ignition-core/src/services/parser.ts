import { parseSolFiles } from "./utils/sol_files";

export default class Parser {
  private readonly sourcePath: string;

  constructor(sourcePath: string) {
    this.sourcePath = sourcePath;
  }

  public parseSolFiles(contractNames: string[]): string[] {
    return parseSolFiles(this.sourcePath, contractNames, []);
  }
}
