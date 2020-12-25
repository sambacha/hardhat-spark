import { Binding, DeployedContractBinding, module, ModuleBuilder } from '../../../src/interfaces/mortar';
// @ts-ignore
import { DaiModule } from './dai_migration';

export const DaiExampleModule = module('DaiExampleModule', async (m: ModuleBuilder) => {
  const module = await DaiModule;
  await m.bindModule(module);

  const Dai = m.getBinding('Dai');
  const Example = m.contract('Example', Dai);

  Example.afterDeployment(m, 'firstAfterDeployment', async (AddressProvider: Binding, ...bindings: DeployedContractBinding[]): Promise<void> => {
    const [Example] = bindings;

    const example = Example.instance();

    const daiAddress = await example.getDai();

    console.log('THIS IS DAI ADDRESS: ', daiAddress);
  }, Example);
});
