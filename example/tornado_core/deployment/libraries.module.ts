import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';
import { ethers } from 'ethers';

export const LibrariesModule = buildModule('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.library('Hasher');
  m.library('Verifier');
});
