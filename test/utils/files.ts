import { CompiledContractBinding, DeployedContractBinding } from '../../src/interfaces/mortar';
import fs from 'fs';

export function getStateIfExist(dir: string): { [p: string]: DeployedContractBinding } | null {
  if (!fs.existsSync(dir)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(dir, {
    encoding: 'UTF-8'
  }));
}

export function storeNewState(dir: string, state: { [p: string]: CompiledContractBinding } | null): void {
  if (state == undefined) {
    state = {};
  }

  fs.writeFileSync(dir, JSON.stringify(state, null, 4));
  return;
}
