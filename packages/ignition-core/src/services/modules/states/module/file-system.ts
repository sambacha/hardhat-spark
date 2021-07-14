import fs from "fs";
import path from "path";

import { ModuleState, ModuleStateFile } from "../../../types/module";
import { Mutex } from "../../../utils/mutex/simple-mutex";
import { ModuleStateRepo } from "../repo/state-repo";

import { IModuleState, STATE_DIR_NAME, STATE_NAME } from "./index";

export class FileSystemModuleState implements IModuleState {
  private _mutex: Mutex;
  private readonly _statePath: string;

  constructor(currentProjectPath: string) {
    const dir = path.resolve(currentProjectPath, STATE_DIR_NAME);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    this._statePath = dir;

    this._mutex = new Mutex();
  }

  public async getModuleState(
    networkName: string,
    moduleName: string
  ): Promise<ModuleStateFile> {
    const dir = path.resolve(
      this._statePath,
      moduleName,
      `${networkName}_${STATE_NAME}`
    );
    if (!fs.existsSync(dir)) {
      return {};
    }

    return (
      JSON.parse(
        fs.readFileSync(dir, {
          encoding: "utf-8",
        })
      ) ?? {}
    );
  }

  public async storeStates(
    networkName: string,
    moduleName: string,
    moduleStates: ModuleState | null
  ): Promise<boolean> {
    if (moduleStates === undefined) {
      return true;
    }

    const moduleDir = path.resolve(this._statePath, moduleName);
    const metaData = ModuleStateRepo.convertStatesToMetaData(moduleStates);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir);
    }

    const stateDir = path.resolve(moduleDir, `${networkName}_${STATE_NAME}`);
    const jsonMetaData = JSON.stringify(metaData, undefined, 4);
    const release = await this._mutex.acquireQueued();
    try {
      fs.writeFileSync(stateDir, jsonMetaData);
    } catch (e) {
      release();

      throw e;
    }
    release();

    return true;
  }

  public checkIfSet(moduleName: string, networkName: string): boolean {
    const dir = path.resolve(
      this._statePath,
      moduleName,
      `${networkName}_${STATE_NAME}`
    );

    return fs.existsSync(dir);
  }
}
