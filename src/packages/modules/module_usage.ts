import { ModuleStateRepo } from './states/state_repo';
import { ModuleStateFile } from './states/module';
import { ContractBindingMetaData } from '../../interfaces/ignition';
import { checkIfExist, removeLastPathElement } from '../utils/util';
import { CliError } from '../types/errors';
import fs from 'fs';
import * as path from 'path';
import { generateModuleFile } from '../utils/files';
import { FileGenerationType, ModuleFile, ModuleStateBindings } from '../types/migration';

export class ModuleUsage {
  private readonly fileLocation: string;
  private moduleName: string | undefined;
  private moduleStateRepo: ModuleStateRepo;

  constructor(deploymentFilePath: string, moduleStateRepo: ModuleStateRepo) {
    // strip file name and store them separately
    this.moduleStateRepo = moduleStateRepo;
    this.fileLocation = removeLastPathElement(deploymentFilePath);
  }

  generateRawUsage(moduleName: string, moduleStateFile: ModuleStateFile): ModuleStateBindings {
    if (checkIfExist(this.moduleName)) {
      throw new CliError('Usage generation has not been concluded.');
    }
    this.moduleName = moduleName;
    const rawUsage: ModuleStateBindings = {};
    for (let [elementName, element] of Object.entries(moduleStateFile)) {
      element = element as ContractBindingMetaData;
      if (!element._isContractBindingMetaData) {
        continue;
      }

      rawUsage[elementName] = element;
    }

    return rawUsage;
  }

  generateUsageFile(moduleRawUsage: ModuleStateBindings): ModuleFile {
    if (!checkIfExist(this.moduleName)) {
      throw new CliError('Module name is missing.');
    }

    return generateModuleFile(this.moduleName, moduleRawUsage, FileGenerationType.usage);
  }

  storeUsageFile(moduleRawUsage: ModuleFile) {
    const stateDir = path.resolve(this.fileLocation, `${this.moduleName}.usage.ts`);
    fs.writeFileSync(stateDir, moduleRawUsage);

    this.moduleName = undefined;
  }
}
