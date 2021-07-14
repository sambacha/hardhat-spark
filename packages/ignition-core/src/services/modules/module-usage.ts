import fs from "fs";
import * as path from "path";

import {
  ContractBindingMetaData,
  ModuleStateBindings,
} from "../../interfaces/hardhat-ignition";
import { CliError } from "../types/errors";
import { FileGenerationType, ModuleFile } from "../types/migration";
import { ModuleStateFile } from "../types/module";
import { generateModuleFile } from "../utils/file-generator";
import { checkIfExist, removeLastPathElement } from "../utils/util";

import { ModuleStateRepo } from "./states/repo/state-repo";

export class ModuleUsage {
  private readonly _fileLocation: string;
  private _moduleName: string | undefined;
  private _moduleStateRepo: ModuleStateRepo;

  constructor(deploymentFilePath: string, moduleStateRepo: ModuleStateRepo) {
    // strip file name and store them separately
    this._moduleStateRepo = moduleStateRepo;
    this._fileLocation = removeLastPathElement(deploymentFilePath);
  }

  public generateRawUsage(
    moduleName: string,
    moduleStateFile: ModuleStateFile
  ): ModuleStateBindings {
    if (checkIfExist(this._moduleName)) {
      throw new CliError("Usage generation has not been concluded.");
    }
    this._moduleName = moduleName;
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

  public generateUsageFile(moduleRawUsage: ModuleStateBindings): ModuleFile {
    if (this._moduleName === undefined || !checkIfExist(this._moduleName)) {
      throw new CliError("Module name is missing.");
    }

    return generateModuleFile(
      this._moduleName,
      moduleRawUsage,
      FileGenerationType.USAGE
    );
  }

  public storeUsageFile(moduleRawUsage: ModuleFile) {
    const stateDir = path.resolve(
      this._fileLocation,
      `${this._moduleName}.usage.ts`
    );
    fs.writeFileSync(stateDir, moduleRawUsage);

    this._moduleName = undefined;
  }
}
