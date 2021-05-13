import { buildModule, ModuleBuilder } from 'ignition-core';
import { ethers } from 'ethers';

export const LibrariesModule = buildModule('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.library('Hasher');
  m.library('Verifier');
});
