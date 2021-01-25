import fs from 'fs';
import { ModuleStateFile } from '../../lib/packages/modules/states/module';

export function getStateIfExist(dir: string): ModuleStateFile {
  if (!fs.existsSync(dir)) {
    return undefined;
  }

  return JSON.parse(fs.readFileSync(dir, {
    encoding: 'UTF-8'
  }));
}

export function storeNewState(dir: string, state: ModuleStateFile | null): void {
  if (state == undefined) {
    state = {};
  }

  fs.writeFileSync(dir, JSON.stringify(state, undefined, 4));
  return;
}
