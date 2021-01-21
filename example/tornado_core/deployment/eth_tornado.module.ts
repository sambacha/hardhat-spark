require('dotenv').config({path: '../.env'});
import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import { LibrariesModule } from './libraries.module';

const {
  MERKLE_TREE_HEIGHT,
  ETH_AMOUNT
} = process.env;

export const ETHTornadoModule = module('ETHTornadoModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.bindModule(LibrariesModule);

  m.contract('ETHTornado', m.Verifier, ETH_AMOUNT, MERKLE_TREE_HEIGHT, wallets[0].address);
});
