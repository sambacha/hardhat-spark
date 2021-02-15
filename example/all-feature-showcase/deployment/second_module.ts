import { buildModule, ModuleBuilder } from '../../../src/interfaces/mortar';
import { ExampleModule } from './module';
import { ethers } from 'ethers';

export const ThirdExampleModule = buildModule('ThirdExampleModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  await m.module(ExampleModule, undefined, wallets);

  m.contract('FourthExample', m.SecondExample);
});
