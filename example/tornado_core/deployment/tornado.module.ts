import { buildModule, ModuleBuilder } from 'ignition-core';
import { ethers } from 'ethers';
import { LibrariesModule } from './libraries.module';
import { ETHTornadoModule } from './eth_tornado.module';
import { ERC20TornadoModule } from './erc20_tornado.module';

export const TornadoModule = buildModule('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  await m.useModule(LibrariesModule);

  await m.useModule(ETHTornadoModule, m.getAllOpts(), wallets);
  await m.useModule(ERC20TornadoModule, m.getAllOpts(), wallets);
});
