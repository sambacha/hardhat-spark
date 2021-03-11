import { buildModule } from '../../../src';
import { FirstModuleBuilder } from '../.ignition/FirstModule/FirstModule';

export const FirstModule = buildModule('FirstModule', async (m: FirstModuleBuilder) => {
  const A = m.contract('A');
  m.contract('B', A);

  A.afterDeploy(m, 'afterDeployBandC', async () => {
    await A.instance().setExample(11);
  });
});
