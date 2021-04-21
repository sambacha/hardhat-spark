require('dotenv').config({path: '../.env'});
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';
import { ethers } from 'ethers';

const {
  MERKLE_TREE_HEIGHT,
  ERC20_TOKEN,
  TOKEN_AMOUNT,
} = process.env;

export const ERC20TornadoModule = buildModule('ERC20TornadoModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  const token = ERC20_TOKEN;
  let mock;
  if (token === '') {
    mock = m.contract('ERC20Mock');
  }

  const ERC20 = m.contract(
    'ERC20Tornado',
    m.Verifier,
    TOKEN_AMOUNT,
    MERKLE_TREE_HEIGHT,
    wallets[0].address,
    mock ? mock : token,
  );

  ERC20.afterDeploy(m, 'ERC20AfterDeploy', async () => {
  });
});
