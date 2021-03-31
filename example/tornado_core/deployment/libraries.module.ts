import { ethers } from 'ethers';
import { buildModule, ModuleBuilder } from '../../../src';

export const LibrariesModule = buildModule('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.contract('Hasher');
  m.contract('Verifier');
});
