import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
// @ts-ignore
import { ExampleModule } from './migration';

export const ThirdExampleModule = module('ThirdExampleModule', async (m: ModuleBuilder) => {
  await m.bindModule(ExampleModule);

  const secondExample = m.SecondExample;
  m.contract('FourthExample', secondExample);
});
