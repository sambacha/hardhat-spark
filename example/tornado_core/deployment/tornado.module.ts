import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';
import { ethers } from 'ethers';
import { LibrariesModule } from './libraries.module';
import { ETHTornadoModule } from './eth_tornado.module';
import { ERC20TornadoModule } from './erc20_tornado.module';

export const TornadoModule = buildModule('LibrariesModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  await m.useModule(LibrariesModule);

  await m.useModule(ETHTornadoModule, undefined, wallets);
  await m.useModule(ERC20TornadoModule, undefined, wallets);
});
