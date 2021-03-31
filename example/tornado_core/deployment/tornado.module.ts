import { buildModule, ModuleBuilder } from '../../../src';
import { ethers } from 'ethers';
import { LibrariesModule } from './libraries.module';
import { ERC20TornadoModule } from './erc20_tornado.module';
import { ETHTornadoModule } from './eth_tornado.module';

export const TornadoModule = buildModule('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  await m.module(LibrariesModule);

  await m.module(ETHTornadoModule, wallets);
  await m.module(ERC20TornadoModule, wallets);
});
