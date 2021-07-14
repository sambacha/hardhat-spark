import { ModuleStateBindings } from "../../interfaces/hardhat-ignition";
import { CliError } from "../types/errors";
import {
  FileGenerationType,
  MODULE_FUNC,
  ModuleFile,
  USAGE_FUNC,
} from "../types/migration";

export function generateModuleFile(
  moduleName: string,
  moduleStateBindings: ModuleStateBindings,
  fileGenerationType: FileGenerationType
): ModuleFile {
  let buildName;
  switch (fileGenerationType) {
    case FileGenerationType.USAGE:
      buildName = USAGE_FUNC;
      break;
    case FileGenerationType.MODULE:
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
    if (contractMap[element.contractName] !== undefined) {
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
