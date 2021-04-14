require('dotenv').config({path: '../.env'});
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';
import { ethers } from 'ethers';

const {
  MERKLE_TREE_HEIGHT,
  ETH_AMOUNT
} = process.env;

export const ETHTornadoModule = buildModule('ETHTornadoModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.contract('ETHTornado', m.Verifier, ETH_AMOUNT, MERKLE_TREE_HEIGHT, wallets[0].address);
});
