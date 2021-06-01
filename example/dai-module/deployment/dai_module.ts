import * as path from 'path';
import { buildModule, ModuleBuilder } from 'ignition-core';

require('dotenv').config({path: path.resolve(__dirname + './../.env')});

export const DaiModule = buildModule('DaiModule', async (m: ModuleBuilder) => {
  m.contract('Dai', 1);
});
