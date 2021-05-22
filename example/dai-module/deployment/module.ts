// @ts-ignore
import { DaiModule } from './dai_module';
import { buildModule, ModuleBuilder } from 'ignition-core';

export const DaiExampleModule = buildModule('DaiExampleModule', async (m: ModuleBuilder) => {
  await m.useModule(DaiModule);

  const Dai = m.Dai;
  const Example = m.contract('Example', Dai);

  Example.afterDeploy(m, 'firstAfterDeploy', async (): Promise<void> => {
    const example = Example.deployed();

    await example.getDai();
  }, Example);
});
