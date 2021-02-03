import { ContractBinding, ContractEvent, ModuleBuilder } from '../mortar';
import { expectFuncRead } from './expectancy';
import { ethers } from 'ethers';

export const mutator = async (
  m: ModuleBuilder,
  name: string,
  setter: ContractBinding,
  setterFunc: string,
  getterFunc: string,
  setterArgs: any[],
  getterArgs: any[],
  expectedValue: any,
  ...deps: ContractBinding[]
): Promise<ContractEvent> => {
  const usages: (ContractBinding | ContractEvent)[] = [];
  for (const arg of setterArgs) {
    if (arg instanceof ContractBinding || arg instanceof ContractBinding) {
      usages.push(arg);
    }
  }

  return m.group(setter, ...deps).afterDeploy(m, name, async (): Promise<void> => {
    await setter.instance()[`${setterFunc}`](...setterArgs);

    await expectFuncRead(expectedValue, setter.instance()[`${getterFunc}`], ...getterArgs);
  }, ...usages);
};

export const filler = async (
  m: ModuleBuilder,
  name: string,
  rootWallet: ethers.Wallet,
  wallets: ethers.Wallet[]
): Promise<void> => {
  m.onStart('on start distribute ethers to all accounts', async () => {
    const chainId = await rootWallet.getChainId();
    const rootAddress = await rootWallet.getAddress();
    for (let i = 0; i < wallets.length; i++) {
      await rootWallet.sendTransaction({
        from: rootAddress,
        to: await wallets[i].getAddress(),
        value: ethers.utils.parseUnits('1', 'ether'),
        nonce: await rootWallet.getTransactionCount(),
        gasPrice: 1, // @TODO fix this to be fetched accordingly
        gasLimit: 21000,
        chainId: chainId,
      });
    }
  });
};
