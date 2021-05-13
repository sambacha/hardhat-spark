import { buildModule, ModuleBuilder } from 'ignition-core';
// @ts-ignore
import { ExampleModule } from './module';
import { ethers } from 'ethers';

export const ThirdExampleModule = buildModule('ThirdExampleModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  await m.useModule(ExampleModule, undefined, wallets);

  m.contract('FourthExample', m.SecondExample);
});
