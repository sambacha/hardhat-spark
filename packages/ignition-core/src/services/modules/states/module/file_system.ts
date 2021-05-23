import fs from "fs";
import path from "path";

import { Mutex } from "../../../utils/mutex/simple_mutex";
import { ModuleStateRepo } from "../repo/state_repo";

import {
  IModuleState,
  ModuleState,
  ModuleStateFile,
  STATE_DIR_NAME,
  STATE_NAME,
} from "./index";

export class FileSystemModuleState implements IModuleState {
  private mutex: Mutex;
  private readonly statePath: string;

  constructor(currentProjectPath: string) {
    const dir = path.resolve(currentProjectPath, STATE_DIR_NAME);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    this.statePath = dir;

    this.mutex = new Mutex();
  }

  public async getModuleState(
    networkName: string,
    moduleName: string
  ): Promise<ModuleStateFile> {
    const dir = path.resolve(
      this.statePath,
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
      ) || {}
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

    const moduleDir = path.resolve(this.statePath, moduleName);
    const metaData = ModuleStateRepo.convertStatesToMetaData(moduleStates);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir);
    }

    const stateDir = path.resolve(moduleDir, `${networkName}_${STATE_NAME}`);
    const jsonMetaData = JSON.stringify(metaData, undefined, 4);
    const release = await this.mutex.acquireQueued();
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
      this.statePath,
      moduleName,
      `${networkName}_${STATE_NAME}`
    );

    return fs.existsSync(dir);
  }
}
