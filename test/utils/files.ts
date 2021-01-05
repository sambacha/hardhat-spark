import { ContractBinding } from '../../src/interfaces/mortar';
import fs from 'fs';

export function getStateIfExist(dir: string): { [p: string]: ContractBinding } | null {
  if (!fs.existsSync(dir)) {
    return undefined;
  }

  return JSON.parse(fs.readFileSync(dir, {
    encoding: 'UTF-8'
  }));
}

export function storeNewState(dir: string, state: { [p: string]: ContractBinding } | null): void {
  if (state == undefined) {
    state = {};
  }

  fs.writeFileSync(dir, JSON.stringify(state, undefined, 4));
  return;
}
