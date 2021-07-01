import * as fs from "fs";
import {
  IgnitionCore,
  ModuleStateFile,
  STATE_DIR_NAME,
  STATE_NAME,
} from "ignition-core";
import * as path from "path";

export function getStateIfExist(dir: string): ModuleStateFile | undefined {
  if (!fs.existsSync(dir)) {
    return undefined;
  }

  return JSON.parse(
    fs.readFileSync(dir, {
      encoding: "utf-8",
    })
  );
}

export async function getStateObject(
  ignitionCore: IgnitionCore,
  moduleName: string
): Promise<ModuleStateFile> {
  if (ignitionCore?.moduleStateRepo !== undefined) {
    return ignitionCore.moduleStateRepo.getStateIfExist(moduleName);
  }

  return {};
}

export function storeNewState(
  dir: string,
  state: ModuleStateFile | null
): void {
  if (state === undefined) {
    state = {};
  }

  fs.writeFileSync(dir, JSON.stringify(state, undefined, 4));
  return;
}

export async function loadStateFile(
  projectLocation: string,
  ignition: IgnitionCore,
  moduleName: string = "ExampleModule",
  networkName: string = "local"
) {
  const stateFilePath = path.join(
    projectLocation,
    STATE_DIR_NAME,
    moduleName,
    `${networkName}_${STATE_NAME}`
  );
  let stateFile;
  try {
    stateFile = require(stateFilePath);
  } catch (e) {
    stateFile = {};
  }

  if (ignition?.moduleStateRepo !== undefined) {
    await ignition.moduleStateRepo.storeNewState(moduleName, stateFile);
  }
}
