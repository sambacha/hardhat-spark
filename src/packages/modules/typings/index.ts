import path from 'path';
import { STATE_DIR_NAME } from '../states/module';
import fs from 'fs';
import { Module } from '../../../interfaces/hardhat_ignition';

export class ModuleTypings {
  private readonly statePath: string;

  constructor() {
  }

  generate(deploymentPath: string, moduleName: string, module: Module | undefined) {
    if (module == undefined) {
      return;
    }

    const bindings = module.getAllBindings();
    const actions = module.getAllActions();
    const events = module.getAllEvents();
    const params = module.getOpts().params;

    const fileName = `${moduleName}.d.ts`;
    const filePath = path.resolve(deploymentPath, fileName);

    let file = `import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from '@tenderly/hardhat-ignition';

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

    if (params) {
      for (const [paramName, paramValue] of Object.entries(params)) {
        file += `
  ${paramName}: ${typeof paramValue};`; // @TODO change this to complex object typings
      }
    }

    file += `
}`;

    fs.writeFileSync(filePath, file);
  }
}
