import fs from "fs";
import path from "path";

import {
  ContractBindingMetaData,
  ModuleStateBindings,
} from "../../interfaces/hardhat_ignition";
import { FileGenerationType } from "../types/migration";
import { ModuleStateFile } from "../types/module";
import { generateModuleFile } from "../utils/sol_files";
import { checkIfExist } from "../utils/util";

const DEFAULT_MODULE_FOLDER = "deployment";

export class ModuleMigrationService {
  private readonly _currentPath: string;

  constructor(currentPath: string) {
    this._currentPath = currentPath;
  }

  public mapModuleStateFileToContractBindingsMetaData(moduleStateFiles: {
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

  public generateModuleFile(
    moduleName: string,
    moduleStateBindings: ModuleStateBindings
  ): string {
    return generateModuleFile(
      moduleName,
      moduleStateBindings,
      FileGenerationType.module
    );
  }

  public storeModuleFile(moduleFile: string, moduleName: string) {
    const stateDir = path.resolve(
      this._currentPath,
      DEFAULT_MODULE_FOLDER,
      `${moduleName}.module.ts`
    );
    fs.writeFileSync(stateDir, moduleFile);
  }
}
