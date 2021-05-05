require('dotenv').config({path: '../.env'});
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';
import { ethers } from 'ethers';

export const ETHTornadoModule = buildModule('ETHTornadoModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.contract('ETHTornado', m.Verifier, m.ETH_AMOUNT, m.MERKLE_TREE_HEIGHT, wallets[0].address);
});
