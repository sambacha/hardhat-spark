import fs from "fs";
import * as path from "path";

import {
  ContractBindingMetaData,
  ModuleStateBindings,
} from "../../interfaces/hardhat_ignition";
import { CliError } from "../types/errors";
import { FileGenerationType, ModuleFile } from "../types/migration";
import { generateModuleFile } from "../utils/sol_files";
import { checkIfExist, removeLastPathElement } from "../utils/util";

import { ModuleStateFile } from "./states/module";
import { ModuleStateRepo } from "./states/repo/state_repo";

export class ModuleUsage {
  private readonly fileLocation: string;
  private moduleName: string | undefined;
  private moduleStateRepo: ModuleStateRepo;

  constructor(deploymentFilePath: string, moduleStateRepo: ModuleStateRepo) {
    // strip file name and store them separately
    this.moduleStateRepo = moduleStateRepo;
    this.fileLocation = removeLastPathElement(deploymentFilePath);
  }

  public generateRawUsage(
    moduleName: string,
    moduleStateFile: ModuleStateFile
  ): ModuleStateBindings {
    if (checkIfExist(this.moduleName)) {
      throw new CliError("Usage generation has not been concluded.");
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

  public generateUsageFile(moduleRawUsage: ModuleStateBindings): ModuleFile {
    if (!this.moduleName || !checkIfExist(this.moduleName)) {
      throw new CliError("Module name is missing.");
    }

    return generateModuleFile(
      this.moduleName,
      moduleRawUsage,
      FileGenerationType.usage
    );
  }

  public storeUsageFile(moduleRawUsage: ModuleFile) {
    const stateDir = path.resolve(
      this.fileLocation,
      `${this.moduleName}.usage.ts`
    );
    fs.writeFileSync(stateDir, moduleRawUsage);

    this.moduleName = undefined;
  }
}
