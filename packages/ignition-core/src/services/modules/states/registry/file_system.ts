import fs from "fs";
import path from "path";

import { checkIfExist } from "../../../utils/util";

import {
  IModuleRegistryResolver,
  ModuleRegistryResolver,
  REGISTRY_NAME,
} from "./index";

export class FileSystemRegistry implements IModuleRegistryResolver {
  private readonly _version: string;
  private readonly _registryPath: string;

  constructor(registryDir: string, version: string = "v0.0.1") {
    this._version = version;

    const dir = path.resolve(registryDir);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    this._registryPath = dir;
  }

  public async resolveContract(
    networkId: string,
    moduleName: string,
    bindingName: string
  ): Promise<string> {
    const stateObject = await this._getRegistry(moduleName, networkId);
    if (!checkIfExist(stateObject[this._version])) {
      stateObject[this._version] = {};
    }

    return stateObject[this._version][bindingName];
  }

  public async setAddress(
    networkId: string,
    moduleName: string,
    bindingName: string,
    contractAddress: string
  ): Promise<boolean> {
    const stateObject = await this._getRegistry(moduleName, networkId);
    if (!checkIfExist(stateObject[this._version])) {
      stateObject[this._version] = {};
    }

    stateObject[this._version][bindingName] = contractAddress;
    if (!fs.existsSync(this._registryPath)) {
      fs.mkdirSync(this._registryPath);
    }

    const stateDir = path.resolve(
      this._registryPath,
      `${moduleName}_${networkId}_${REGISTRY_NAME}`
    );
    fs.writeFileSync(stateDir, JSON.stringify(stateObject, undefined, 4));
    return true;
  }

  private async _getRegistry(
    moduleName: string,
    networkId: string
  ): Promise<ModuleRegistryResolver> {
    const dir = path.resolve(
      this._registryPath,
      `${moduleName}_${networkId}_${REGISTRY_NAME}`
    );
    if (!fs.existsSync(dir)) {
      return {};
    }

    return (JSON.parse(
      fs.readFileSync(dir, {
        encoding: "utf-8",
      })
    ) ?? {}) as ModuleRegistryResolver;
  }
}
