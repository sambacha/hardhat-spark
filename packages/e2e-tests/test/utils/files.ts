import * as fs from 'fs';
import { ModuleStateFile, STATE_DIR_NAME, STATE_NAME } from 'ignition-core';
import { IgnitionTests } from 'ignition-test';
import * as path from 'path';
import { DEFAULT_NETWORK_NAME } from 'ignition-core/lib/services/utils/constants';

export function getStateIfExist(dir: string): ModuleStateFile | undefined {
  if (!fs.existsSync(dir)) {
    return undefined;
  }

  return JSON.parse(fs.readFileSync(dir, {
    encoding: 'utf-8'
  }));
}

export function storeNewState(dir: string, state: ModuleStateFile | null): void {
  if (state == undefined) {
    state = {};
  }

  fs.writeFileSync(dir, JSON.stringify(state, undefined, 4));
  return;
}

export async function loadStateFile(projectLocation: string, ignition: IgnitionTests, moduleName: string = 'ExampleModule', networkName: string = DEFAULT_NETWORK_NAME) {
  const stateFilePath = path.join(projectLocation, STATE_DIR_NAME, moduleName, `${networkName}_${STATE_NAME}`);
  let stateFile;
  try {
    stateFile = require(stateFilePath);
  } catch (e) {
    stateFile = {};
  }
  await ignition.setStateFile(moduleName, stateFile);
}
