import { buildModule } from '../../../src/interfaces/ignition';
// @ts-ignore
import { DaiModule } from './dai_module';
// @ts-ignore
import { ModuleBuilder } from '../../../src/interfaces/ignition';

export const DaiExampleModule = buildModule('DaiExampleModule', async (m: ModuleBuilder) => {
  await m.module(DaiModule);

  const Dai = m.Dai;
  const Example = m.contract('Example', Dai);

  Example.afterDeployment(m, 'firstAfterDeployment', async (): Promise<void> => {
    const example = Example.instance();

    const daiAddress = await example.getDai();

    console.log('THIS IS DAI ADDRESS: ', daiAddress);
  }, Example);
});
