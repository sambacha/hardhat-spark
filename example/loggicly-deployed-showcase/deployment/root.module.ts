import { module, ModuleBuilder } from '../../../src/interfaces/mortar';

export const RootModule = module('RootModule', async (m: ModuleBuilder) => {
  const A = m.contract('A');
  const B = m.contract('B', A);
  const C = m.contract('C', A);

  m.group(B, C).afterDeploy(m, 'afterDeployBandC', async () => {
    await A.instance().setExample(11);
  });
});
