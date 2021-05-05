require('dotenv').config({path: '../.env'});
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';
import { ethers } from 'ethers';

export const ERC20TornadoModule = buildModule('ERC20TornadoModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  const token = m.ERC20_TOKEN;
  let mock;
  if (token === '') {
    mock = m.contract('ERC20Mock');
  }

  const ERC20 = m.contract(
    'ERC20Tornado',
    m.Verifier,
    m.TOKEN_AMOUNT,
    m.MERKLE_TREE_HEIGHT,
    wallets[0].address,
    mock ? mock : token,
  );

  ERC20.afterDeploy(m, 'ERC20AfterDeploy', async () => {
  });
});
