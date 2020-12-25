import { IModuleRegistryResolver, ModuleRegistryResolver, REGISTRY_NAME } from './index';
import path from 'path';
import fs from 'fs';
import { checkIfExist } from '../../../utils/util';

export class FileSystemRegistry implements IModuleRegistryResolver {
  private readonly version: string;
  private readonly registryPath: string;

  constructor(registryDir: string, version: string = 'v0.0.1') {
    this.version = version;

    const dir = path.resolve(registryDir);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    this.registryPath = dir;
  }

  async resolveContract(networkId: number, moduleName: string, bindingName: string): Promise<string> {
    const stateObject = await this.getRegistry(moduleName, networkId);
    if (!checkIfExist(stateObject[this.version])) {
      stateObject[this.version] = {};
    }

    return stateObject[this.version][bindingName];
  }

  async setAddress(networkId: number, moduleName: string, bindingName: string, contractAddress: string): Promise<boolean> {
    const stateObject = await this.getRegistry(moduleName, networkId);
    if (!checkIfExist(stateObject[this.version])) {
      stateObject[this.version] = {};
    }

    stateObject[this.version][bindingName] = contractAddress;
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath);
    }

    const stateDir = path.resolve(this.registryPath, `${moduleName}_${networkId}_${REGISTRY_NAME}`);
    fs.writeFileSync(stateDir, JSON.stringify(stateObject, null, 4));
    return true;
  }

  private async getRegistry(moduleName: string, networkId: number): Promise<ModuleRegistryResolver> {
    const dir = path.resolve(this.registryPath, `${moduleName}_${networkId}_${REGISTRY_NAME}`);
    if (!fs.existsSync(dir)) {
      return {};
    }

    return (JSON.parse(fs.readFileSync(dir, {
      encoding: 'UTF-8'
    })) || {}) as ModuleRegistryResolver;
  }
}
