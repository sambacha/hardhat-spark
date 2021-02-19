import { ContractBinding, ContractEvent, ModuleBuilder } from '../mortar';
import { expectFuncRead, expectSlotRead } from './expectancy';
import { ethers } from 'ethers';
import { checkIfExist } from '../../packages/utils/util';

export const mutator = (
  m: ModuleBuilder,
  setter: ContractBinding,
  setterFunc: string,
  setterArgs: any[],
  opts?: {
    name?: string,
    getterFunc?: string,
    getterArgs?: any[],
    expectedValue?: any,
    deps?: (ContractBinding | ContractEvent)[],
    slot?: string,
  },
): ContractEvent => {
  const name = opts?.name ? opts.name : `mutator${setterFunc}${setter.name}`;
  const getFunc = setterFunc.substring(3);
  const getterFunc = opts?.getterFunc ? opts.getterFunc : `${getFunc[0].toLowerCase() + getFunc.slice(1)}`;

  const deps = [];
  if (opts?.deps) {
    deps.push(...opts.deps);
  }

  const usages: (ContractBinding | ContractEvent)[] = [];
  for (const arg of (setterArgs)) {
    if (arg?._isContractBinding || checkIfExist(arg?.eventType)) {
      usages.push(arg);
    }
  }

  const value = setterArgs.pop();
  const keys = setterArgs;
  const getterArgs = opts?.getterArgs ? opts.getterArgs : keys;
  const expectedValue = opts?.expectedValue ? opts.expectedValue : value;

  return m.group(setter, ...deps).afterDeploy(m, name, async (): Promise<void> => {
    await setter.instance()[`${setterFunc}`](...keys, value);

    if (opts?.slot) {
      await expectSlotRead(expectedValue, setter.instance(), opts.slot);
      return;
    }

    await expectFuncRead(expectedValue, setter.instance()[getterFunc], ...getterArgs);
  }, ...usages);
};

export const filler = (
  m: ModuleBuilder,
  rootWallet: ethers.Wallet,
  wallets: ethers.Wallet[]
): void => {
  m.onStart('on start distribute ethers to all accounts', async () => {
    for (let i = 0; i < wallets.length; i++) {
      await rootWallet.sendTransaction({
        from: rootWallet.getAddress(),
        to: wallets[i].getAddress(),
        value: ethers.utils.parseUnits('1', 'ether'),
        gasLimit: 21000,
      });
    }
  });
};
