import * as path from 'path';
import { module } from '../../../src/interfaces/mortar';
// @ts-ignore
import { DaiModuleBuilder } from '../.mortar/DaiModule/DaiModule';

require('dotenv').config({path: path.resolve(__dirname + './../.env')});

export const DaiModule = module('DaiModule', async (m: DaiModuleBuilder) => {
  m.contract('Dai', 1);
});
