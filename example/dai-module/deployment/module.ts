// @ts-ignore
import { DaiModule } from './dai_module';
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';

export const DaiExampleModule = buildModule('DaiExampleModule', async (m: ModuleBuilder) => {
  await m.useModule(DaiModule);

  const Dai = m.Dai;
  const Example = m.contract('Example', Dai);

  Example.afterDeploy(m, 'firstAfterDeploy', async (): Promise<void> => {
    const example = Example.deployed();

    const daiAddress = await example.getDai();

    console.log('THIS IS DAI ADDRESS: ', daiAddress);
  }, Example);
});
