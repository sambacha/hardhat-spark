import { ModuleBuilder, buildModule } from '../../../src';

export const FirstModule = buildModule('FirstModule', async (m: ModuleBuilder) => {
  const A = m.contract('A');
  m.contract('B', A);

  A.afterDeploy(m, 'afterDeployBandC', async () => {
    await A.deployed().setExample(11);
  });
});
