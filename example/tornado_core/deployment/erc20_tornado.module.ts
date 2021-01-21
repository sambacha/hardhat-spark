require('dotenv').config({path: '../.env'});
import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import { LibrariesModule } from './libraries.module';

const {
  MERKLE_TREE_HEIGHT,
  ERC20_TOKEN,
  TOKEN_AMOUNT,
} = process.env;

export const ERC20TornadoModule = module('ERC20TornadoModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  await m.bindModule(LibrariesModule);

  const token = ERC20_TOKEN;
  let mock;
  if (token === '') {
    mock = m.contract('ERC20Mock');
  }

  m.contract(
    'ERC20Tornado',
    m.Verifier,
    TOKEN_AMOUNT,
    MERKLE_TREE_HEIGHT,
    wallets[0].address,
    mock ? mock : token,
  );
});
