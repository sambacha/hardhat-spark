import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
// @ts-ignore
import { DaiModule } from './dai_migration';

export const DaiExampleModule = module('DaiExampleModule', async (m: ModuleBuilder) => {
  const module = await DaiModule;
  await m.bindModule(module);

  const Dai = m.getBinding('Dai');
  const Example = m.contract('Example', Dai);

  Example.afterDeployment(m, 'firstAfterDeployment', async (): Promise<void> => {
    const example = Example.instance();

    const daiAddress = await example.getDai();

    console.log('THIS IS DAI ADDRESS: ', daiAddress);
  }, Example);
});
