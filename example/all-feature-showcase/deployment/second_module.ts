import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
// @ts-ignore
import { ExampleModule } from './migration';

export const ThirdExampleModule = module('ThirdExampleModule', async (m: ModuleBuilder) => {
  await m.module(ExampleModule);

  m.contract('FourthExample', m.SecondExample);
});
