import { cli } from "cli-ux";
import * as fs from "fs";
import * as path from "path";

import { ModuleStateBindings } from "../../interfaces/hardhat_ignition";
import { CliError } from "../types/errors";
import {
  FileGenerationType,
  HardhatBuild,
  MODULE_FUNC,
  ModuleFile,
  USAGE_FUNC,
} from "../types/migration";

const HARDHAT_CHAIN_ID_FILENAME = ".chainId";

export function parseSolFiles(
  sourcePath: string,
  contractNames: string[],
  result: string[]
): string[] {
  const filenames = fs.readdirSync(sourcePath);

  filenames.forEach((name: string) => {
    if (fs.lstatSync(path.resolve(sourcePath, name)).isDirectory()) {
      return parseSolFiles(
        path.resolve(sourcePath, name),
        contractNames,
        result
      );
    }

    if (name.slice(name.length - 3, name.length) === "sol") {
      const content = fs.readFileSync(path.resolve(sourcePath, name), "utf-8");
      if (contractNames.length > 0) {
        result.push(content);
        return [];
      }

      if (new RegExp(contractNames.join("|")).test(content)) {
        result.push(content);
      }

      return [];
    }

    return result;
  });

  return result;
}

export function searchModuleFilesName(
  currentPath: string,
  results: any[]
): string[] {
  const filenames = fs.readdirSync(currentPath);

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(currentPath, fileName)).isDirectory()) {
      return searchModuleFilesName(
        path.resolve(currentPath, fileName),
        results
      );
    }
    if (
      !path.parse(fileName).base.includes("module") ||
      fileName.includes(".log")
    ) {
      return;
    }

    results.push(path.parse(fileName).base);
  });

  return results;
}

export function searchBuilds(currentPath: string, results: any[]): object[] {
  const filenames = fs.readdirSync(currentPath);

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(currentPath, fileName)).isDirectory()) {
      return searchBuilds(path.resolve(currentPath, fileName), results);
    }
    if (path.parse(fileName).ext !== ".json") {
      return;
    }

    const content = fs.readFileSync(path.resolve(currentPath, fileName), {
      encoding: "utf-8",
    });
    let jsonContent;
    try {
      jsonContent = JSON.parse(content);
    } catch (e) {
      cli.error(e);

      return;
    }

    results.push(jsonContent);
  });

  return results;
}

export function searchBuildsAndNetworks(
  currentPath: string,
  results: any[],
  chainId?: string | undefined
): object[] {
  const filenames = fs.readdirSync(currentPath);

  let newChainId = chainId;
  if (filenames.includes(HARDHAT_CHAIN_ID_FILENAME)) {
    newChainId = fs.readFileSync(
      path.resolve(currentPath, HARDHAT_CHAIN_ID_FILENAME),
      { encoding: "utf-8" }
    );
  }

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(currentPath, fileName)).isDirectory()) {
      return searchBuildsAndNetworks(
        path.resolve(currentPath, fileName),
        results,
        newChainId
      );
    }

    if (path.parse(fileName).ext !== ".json") {
      return;
    }

    const content = fs.readFileSync(path.resolve(currentPath, fileName), {
      encoding: "utf-8",
    });
    let jsonContent: HardhatBuild;
    try {
      jsonContent = JSON.parse(content) as HardhatBuild;
      jsonContent.contractName = path.parse(fileName).name;
    } catch (e) {
      cli.error(e);

      return;
    }

    results.push(jsonContent);
  });

  return results;
}

export function generateModuleFile(
  moduleName: string,
  moduleStateBindings: ModuleStateBindings,
  fileGenerationType: FileGenerationType
): ModuleFile {
  let buildName;
  switch (fileGenerationType) {
    case FileGenerationType.usage:
      buildName = USAGE_FUNC;
      break;
    case FileGenerationType.module:
      buildName = MODULE_FUNC;
      break;
    default:
      throw new CliError("File type generation is not valid.");
  }

  let file = `import { ${buildName}, ModuleBuilder } from '@tenderly/hardhat-ignition';

export const ${moduleName} = ${buildName}('${moduleName}', async (m: ModuleBuilder) => {`;

  file += genTemplates(moduleStateBindings);

  file += "\n";

  for (const [, element] of Object.entries(moduleStateBindings)) {
    if (element.library) {
      file += genLibrary(element.contractName);
      continue;
    }

    file += genContract(
      element.name,
      element.contractName,
      element.name !== element.contractName
    );
  }

  file += `
});`;

  return file;
}

function genLibrary(contractName: string): string {
  return `
  const ${contractName} = m.library('${contractName}');`;
}

function genTemplates(moduleStateBindings: ModuleStateBindings): string {
  const contractMap: { [name: string]: number } = {};

  for (const [, element] of Object.entries(moduleStateBindings)) {
    if (contractMap[element.contractName]) {
      contractMap[element.contractName]++;
      continue;
    }

    contractMap[element.contractName] = 1;
  }

  let templatesInitialization = ``;
  Object.entries(contractMap).map((value: [string, number]) => {
    templatesInitialization += `
  m.contractTemplate('${value[0]}');`;
  });

  return templatesInitialization;
}

function genContract(
  elementName: string,
  contractName: string,
  isTemplate: boolean
): string {
  if (isTemplate) {
    return `
  const ${elementName} = m.bindTemplates('${elementName}', '${contractName}');`;
  }

  return `
  const ${elementName} = m.contract('${contractName}');`;
}
