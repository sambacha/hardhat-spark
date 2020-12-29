import { IModuleState, ModuleState, ModuleStateFile, STATE_DIR_NAME, STATE_NAME } from './index';
import path from 'path';
import fs from 'fs';
import { ModuleStateRepo } from '../state_repo';

export class FileSystemModuleState implements IModuleState {
  private mutex: boolean;
  private readonly statePath: string;

  constructor(currentProjectPath: string, mutex: boolean) {
    this.mutex = mutex;
    const dir = path.resolve(currentProjectPath, STATE_DIR_NAME);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    this.statePath = dir;
  }

  async getModuleState(networkId: number, moduleName: string): Promise<ModuleStateFile> {
    const dir = path.resolve(this.statePath, moduleName, `${networkId}_${STATE_NAME}`);
    if (!fs.existsSync(dir)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(dir, {
      encoding: 'UTF-8'
    })) || {};
  }

  async storeStates(networkId: number, moduleName: string, moduleStates: ModuleState | null): Promise<boolean> {
    if (moduleStates == undefined) {
      return true;
    }

    const moduleDir = path.resolve(this.statePath, moduleName);
    const metaData = ModuleStateRepo.convertStatesToMetaData(moduleStates);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir);
    }

    const stateDir = path.resolve(moduleDir, `${networkId}_${STATE_NAME}`);
    this.acquireLock();
    fs.writeFileSync(stateDir, JSON.stringify(metaData, undefined, 4));
    this.unlock();

    return true;
  }

  checkIfSet(moduleName: string, networkId: number): boolean {
    const dir = path.resolve(this.statePath, moduleName, `${networkId}_${STATE_NAME}`);

    return fs.existsSync(dir);
  }

  private acquireLock() {
    if (this.mutex) {
      throw new Error('Lock is already acquired');
    }

    this.mutex = true;
  }

  private unlock() {
    this.mutex = false;
  }
}
