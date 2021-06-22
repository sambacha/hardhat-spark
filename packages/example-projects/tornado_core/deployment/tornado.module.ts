import { buildModule, ModuleBuilder } from 'ignition-core';
import { ethers } from 'ethers';
import { LibrariesModule } from './libraries.module';
import { ETHTornadoModule } from './eth_tornado.module';
import { ERC20TornadoModule } from './erc20_tornado.module';

export const TornadoModule = buildModule('LibrariesModule', async (m: ModuleBuilder, signers: ethers.Signer[]) => {
  await m.useModule(LibrariesModule);

  await m.useModule(ETHTornadoModule, m.getAllParams(), signers);
  await m.useModule(ERC20TornadoModule, m.getAllParams(), signers);
});
