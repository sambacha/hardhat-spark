import { IModuleState, ModuleState, ModuleStateFile, STATE_DIR_NAME, STATE_NAME } from './index';
import path from 'path';
import fs from 'fs';
import { ModuleStateRepo } from '../state_repo';

export class FileSystemModuleState implements IModuleState {
  private _lock: any;
  private readonly statePath: string;

  constructor(currentProjectPath: string) {
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
    const jsonMetaData = JSON.stringify(metaData, undefined, 4);
    const release = await this.acquireQueued();
    try {
      fs.writeFileSync(stateDir, jsonMetaData);
    } catch (e) {
      release();

      throw e;
    }
    release();

    return true;
  }

  checkIfSet(moduleName: string, networkId: number): boolean {
    const dir = path.resolve(this.statePath, moduleName, `${networkId}_${STATE_NAME}`);

    return fs.existsSync(dir);
  }

  private _acquire() {
    let release;
    const lock = this._lock = new Promise(resolve => {
      release = resolve;
    });
    return () => {
      if (this._lock == lock) this._lock = undefined;
      release();
    };
  }

  private isLocked() {
    return this._lock != undefined;
  }

  private acquireQueued() {
    const q = Promise.resolve(this._lock).then(() => release);
    const release = this._acquire();
    return q;
  }
}
