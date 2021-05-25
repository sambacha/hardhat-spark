import { buildModule, ModuleBuilder } from 'ignition-core';
import { ExampleModule } from './module';
import { ethers } from 'ethers';

export const ThirdExampleModule = buildModule('ThirdExampleModule', async (m: ModuleBuilder, wallets: ethers.Signer[]) => {
  await m.useModule(ExampleModule, undefined, wallets);

  m.contract('FourthExample', m.SecondExample);
});
