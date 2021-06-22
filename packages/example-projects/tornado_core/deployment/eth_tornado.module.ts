require('dotenv').config({path: '../.env'});
import { buildModule, ModuleBuilder } from 'ignition-core';
import { ethers } from 'ethers';

export const ETHTornadoModule = buildModule('ETHTornadoModule', async (m: ModuleBuilder, wallets: ethers.Signer[]) => {
  m.contract('ETHTornado', m.Verifier, m.ETH_AMOUNT, m.MERKLE_TREE_HEIGHT, await wallets[0].getAddress());
});
