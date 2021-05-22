import { ModuleStateFile } from './states/module';
import { checkIfExist } from '../utils/util';
import { ContractBindingMetaData } from '../../interfaces/hardhat_ignition';
import { generateModuleFile } from '../utils/files';
import { FileGenerationType, ModuleStateBindings } from '../types/migration';
import path from 'path';
import fs from 'fs';

const DEFAULT_MODULE_FOLDER = 'deployment';

export class ModuleMigrationService {
  private readonly currentPath: string;

  constructor(currentPath: string) {
    this.currentPath = currentPath;
  }

  mapModuleStateFileToContractBindingsMetaData(moduleStateFiles: {
    [network: string]: ModuleStateFile;
  }): ModuleStateBindings {
    const unifiedStateFile: ModuleStateBindings = {};

    for (const [, stateFile] of Object.entries(moduleStateFiles)) {
      for (let [elementName, element] of Object.entries(stateFile)) {
        element = element as ContractBindingMetaData;
        if (!element._isContractBindingMetaData) {
          continue;
        }

        if (checkIfExist(unifiedStateFile[elementName])) {
          continue;
        }

        unifiedStateFile[elementName] = element;
      }
    }

    return unifiedStateFile;
  }

  generateModuleFile(
    moduleName: string,
    moduleStateBindings: ModuleStateBindings
  ): string {
    return generateModuleFile(
      moduleName,
      moduleStateBindings,
      FileGenerationType.module
    );
  }

  storeModuleFile(moduleFile: string, moduleName: string) {
    const stateDir = path.resolve(
      this.currentPath,
      DEFAULT_MODULE_FOLDER,
      `${moduleName}.module.ts`
    );
    fs.writeFileSync(stateDir, moduleFile);
  }
}
