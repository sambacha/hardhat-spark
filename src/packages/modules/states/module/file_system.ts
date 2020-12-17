import {IModuleState, ModuleState, STATE_DIR_NAME, STATE_NAME} from "./index";
import path from "path";
import fs from "fs";
import {ModuleStateRepo} from "../state_repo";

export class FileSystemModuleState implements IModuleState {
  private readonly statePath: string

  constructor(currentProjectPath: string) {
    const dir = path.resolve(currentProjectPath, STATE_DIR_NAME)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    this.statePath = dir
  }

  async getModuleState(networkId: number, moduleName: string): Promise<ModuleState> {
    const dir = path.resolve(this.statePath, moduleName, `${networkId}_${STATE_NAME}`)
    if (!fs.existsSync(dir)) {
      return {}
    }

    return JSON.parse(fs.readFileSync(dir, {
      encoding: 'UTF-8'
    })) || {}
  }

  async storeStates(networkId: number, moduleName: string, moduleStates: ModuleState | null): Promise<boolean> {
    if (moduleStates == null) {
      return true
    }

    const moduleDir = path.resolve(this.statePath, moduleName)
    const metaData = ModuleStateRepo.convertStatesToMetaData(moduleStates)
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir)
    }

    const stateDir = path.resolve(moduleDir, `${networkId}_${STATE_NAME}`)
    fs.writeFileSync(stateDir, JSON.stringify(metaData, null, 4))
    return true
  }

  checkIfSet(moduleName: string ,networkId: number): boolean {
    const dir = path.resolve(this.statePath, moduleName, `${networkId}_${STATE_NAME}`)

    return fs.existsSync(dir);
  }
}
