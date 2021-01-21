
import path from 'path';
import { STATE_DIR_NAME } from '../states/module';
import fs from 'fs';
import { Module } from '../../../interfaces/mortar';

export class ModuleTypings {
  private readonly statePath: string;

  constructor(currentPath: string) {
    const dir = path.resolve(currentPath, STATE_DIR_NAME);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    this.statePath = dir;
  }

  generate(moduleName: string, module: Module | undefined) {
    if (module == undefined) {
      return;
    }

    const moduleDir = path.resolve(this.statePath, moduleName);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir);
    }

    const bindings = module.getAllBindings();
    const actions = module.getAllActions();
    const events = module.getAllEvents();

    const fileName = `${moduleName}.d.ts`;
    const stateDir = path.resolve(moduleDir, fileName);

    let file = `import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from '../../../../src/interfaces/mortar';

export declare class ${moduleName}Builder extends ModuleBuilder {`;
    for (const binding of Object.values(bindings)) {
      file += `
  ${binding.name}: ContractBinding;`;
    }

    for (const binding of Object.values(events)) {
      file += `
  ${binding.event.name}: StatefulEvent;`;
    }

    for (const binding of Object.values(actions)) {
      file += `
  ${binding.name}: Action;`;
    }

    file += `
}`;

    fs.writeFileSync(stateDir, file);
  }
}
