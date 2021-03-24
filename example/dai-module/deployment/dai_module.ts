import * as path from 'path';
import { buildModule } from '../../../src';
// @ts-ignore
import { DaiModuleBuilder } from '../.ignition/DaiModule/DaiModule';

require('dotenv').config({path: path.resolve(__dirname + './../.env')});

export const DaiModule = buildModule('DaiModule', async (m: DaiModuleBuilder) => {
  m.contract('Dai', 1);
});
