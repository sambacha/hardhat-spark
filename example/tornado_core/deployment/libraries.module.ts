import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
import { ethers } from 'ethers';

export const LibrariesModule = module('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.contract('Hasher');
  m.contract('Verifier');
});
