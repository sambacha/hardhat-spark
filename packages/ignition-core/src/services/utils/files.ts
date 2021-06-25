import fs from "fs";
import path from "path";

import { MissingContractMetadata } from "../types";

export function parseFiles(
  sourcePath: string,
  contractNames: string[],
  result: string[]
): string[] {
  let filenames;
  try {
    filenames = fs.readdirSync(sourcePath);
  } catch (e) {
    throw new MissingContractMetadata(sourcePath);
  }

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(sourcePath, fileName)).isDirectory()) {
      return parseFiles(
        path.resolve(sourcePath, fileName),
        contractNames,
        result
      );
    }
    if (path.parse(fileName).ext !== ".json") {
      return;
    }

    if (contractNames.length === 0) {
      const content = fs.readFileSync(
        path.resolve(sourcePath, fileName),
        "utf-8"
      );

      result.push(content);
      return [];
    }

    const actualFileName = path.parse(fileName).name;
    if (contractNames.includes(actualFileName)) {
      const content = fs.readFileSync(
        path.resolve(sourcePath, fileName),
        "utf-8"
      );

      result.push(content);
    }

    return result;
  });

  return result;
}
