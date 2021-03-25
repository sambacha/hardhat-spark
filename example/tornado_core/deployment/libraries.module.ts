import { buildModule, ModuleBuilder } from '../../../src';
import { ethers } from 'ethers';

export const LibrariesModule = buildModule('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.contract('Hasher');
  m.contract('Verifier');
});
