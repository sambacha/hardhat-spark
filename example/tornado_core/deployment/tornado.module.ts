import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import { LibrariesModule } from './libraries.module';
import { ERC20TornadoModule } from './erc20_tornado.module';
import { ETHTornadoModule } from './eth_tornado.module';

export const TornadoModule = module('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  m.bindModule(LibrariesModule);

  m.bindModule(ETHTornadoModule);
  m.bindModule(ERC20TornadoModule);
});
