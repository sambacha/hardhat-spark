import { buildModule } from '../../../src/interfaces/mortar';
// @ts-ignore
import { DaiModule } from './dai_module';
// @ts-ignore
import { DaiExampleModuleBuilder } from '../.mortar/DaiExampleModule/DaiExampleModule';

export const DaiExampleModule = buildModule('DaiExampleModule', async (m: DaiExampleModuleBuilder) => {
  await m.module(DaiModule);

  const Dai = m.Dai;
  const Example = m.contract('Example', Dai);

  Example.afterDeployment(m, 'firstAfterDeployment', async (): Promise<void> => {
    const example = Example.instance();

    const daiAddress = await example.getDai();

    console.log('THIS IS DAI ADDRESS: ', daiAddress);
  }, Example);
});
