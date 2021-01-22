import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
import { ethers } from 'ethers';

export const RootModule = module('RootModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  const B = m.contract('B');

  const A = m.contract('A');

  m.group(A, B).afterDeploy(m, 'afterDeployB', async () => {
    await A.instance().setExample(11);
  });

  A.afterDeploy(m, 'afterDeployA', async () => {
    await A.instance().setExample(10);
  });
});
