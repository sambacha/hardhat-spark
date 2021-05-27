import { parseSolFiles } from "./utils/sol_files";

export default class Parser {
  private readonly _sourcePath: string;

  constructor(sourcePath: string) {
    this._sourcePath = sourcePath;
  }

  public parseSolFiles(contractNames: string[]): string[] {
    return parseSolFiles(this._sourcePath, contractNames, []);
  }
}
