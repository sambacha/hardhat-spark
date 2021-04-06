import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';
// @ts-ignore
import { ExampleModule } from './module';
import { ethers } from 'ethers';

export const ThirdExampleModule = buildModule('ThirdExampleModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  await m.useModule(ExampleModule, undefined, wallets);

  m.contract('FourthExample', m.SecondExample);
});
