import { ModuleStateRepo } from './states/state_repo';
import { ModuleStateFile } from './states/module';
import { ContractBindingMetaData } from '../../interfaces/mortar';
import { checkIfExist, removeLastPathElement } from '../utils/util';
import { CliError } from '../types/errors';
import fs from 'fs';
import * as path from 'path';

export type ModuleRawUsage = { [p: string]: ContractBindingMetaData };
export type ModuleUsageFile = string;

export class ModuleUsage {
  private fileLocation: string;
  private moduleName: string | undefined;
  private moduleStateRepo: ModuleStateRepo;

  constructor(deploymentFilePath: string, moduleStateRepo: ModuleStateRepo) {
    // strip file name and store them separately
    this.moduleStateRepo = moduleStateRepo;
    this.fileLocation = removeLastPathElement(deploymentFilePath);
  }

  generateRawUsage(moduleName: string, moduleStateFile: ModuleStateFile): ModuleRawUsage {
    if (checkIfExist(this.moduleName)) {
      throw new CliError('Usage generation has not been concluded.');
    }
    this.moduleName = moduleName;
    const rawUsage: ModuleRawUsage = {};
    for (let [elementName, element] of Object.entries(moduleStateFile)) {
      element = element as ContractBindingMetaData;
      if (!element._isContractBindingMetaData) {
        continue;
      }

      rawUsage[elementName] = element;
    }

    return rawUsage;
  }

  generateUsageFile(moduleRawUsage: ModuleRawUsage): ModuleUsageFile {
    if (!checkIfExist(this.moduleName)) {
      throw new CliError('Module name is missing.');
    }

    let file = `import { buildUsage, ModuleBuilder } from '@tenderly/mortar';

export const ${this.moduleName} = buildUsage('${this.moduleName}', async (m: ModuleBuilder) => {`;

    file += this.genPrototypes(moduleRawUsage);

    file += '\n';

    for (const [, element] of Object.entries(moduleRawUsage)) {
      if (element.library) {
        file += ModuleUsage.genLibrary(element);
        continue;
      }

      file += ModuleUsage.genContract(element, element.name != element.contractName);
    }

    file += `
});`;

    return file;
  }

  storeUsageFile(moduleRawUsage: ModuleUsageFile) {
    const stateDir = path.resolve(this.fileLocation, `${this.moduleName}.usage.ts`);
    fs.writeFileSync(stateDir, moduleRawUsage);

    this.moduleName = undefined;
  }

  private genPrototypes(moduleRawUsage: ModuleRawUsage): string {
    const contractMap: { [name: string]: number } = {};

    for (const [, element] of Object.entries(moduleRawUsage)) {
      if (contractMap[element.contractName]) {
        contractMap[element.contractName]++;
        continue;
      }

      contractMap[element.contractName] = 1;
    }

    let prototypesInitialization = ``;
    Object.entries(contractMap).map((value: [string, number]) => {
      prototypesInitialization += `
  m.prototype('${value[0]}');`;
    });

    return prototypesInitialization;
  }

  private static genLibrary(element: ContractBindingMetaData): string {
    return `
  const ${element.contractName} = m.library('${element.contractName}');`;
  }

  private static genContract(element: ContractBindingMetaData, isPrototype: boolean): string {
    if (isPrototype) {
      return `
  const ${element.name} = m.bindPrototype('${element.name}', '${element.contractName}');`;
    }

    return `
  const ${element.name} = m.contract('${element.contractName}');`;
  }
}
