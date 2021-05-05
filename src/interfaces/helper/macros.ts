import { ContractBinding, ContractEvent, ModuleBuilder } from '../hardhat_ignition';
import { expectFuncRead, expectSlotRead } from './expectancy';
import { ethers } from 'ethers';
import { checkIfExist } from '../../packages/utils/util';

/**
 * sendAfterDeploy is fastest way to set new value and validate if the same value is correctly set. It
 * "smartly" determines what shall be the getter function and arguments from setterFunc and setterArgs. If you want to overwrite
 * any of smartly determined parameters you can do that in `opts` object.
 *
 * @param m ModuleBuilder object or type extended moduleBuilder
 * @param setter Contract binding of contract on which "mutate"/set action shall be applied on.
 * @param setterFunc Name set function that need to be called.
 * @param setterArgs Arguments towards setterFunc
 * @param opts Params that you wish to overwrite with your desired data. name, getterFunc, getterArgs, expectedValue, deps, slot
 */
export const sendAfterDeploy = (
  m: ModuleBuilder | any,
  setter: ContractBinding,
  setterFunc: string,
  setterArgs: any[],
  opts?: {
    eventName?: string,
    getterFunc?: string,
    getterArgs?: any[],
    expectedValue?: any,
    deps?: (ContractBinding | ContractEvent)[],
    slot?: string,
  },
): ContractEvent => {
  const eventName = opts?.eventName ? opts.eventName : `mutator${setterFunc}${setter.name}`;
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

  return m.group(setter, ...deps).afterDeploy(m, eventName, async (): Promise<void> => {
    await setter.deployed()[`${setterFunc}`](...keys, value);

    if (opts?.slot) {
      await expectSlotRead(expectedValue, setter.deployed(), opts.slot);
      return;
    }

    await expectFuncRead(expectedValue, setter.deployed()[getterFunc], ...getterArgs);
  }, ...usages);
};

/**
 * This is helper function that will send 1 ether to all wallets from root wallet. It is mainly intended for testing
 * purposes.
 *
 * @param m ModuleBuilder object provided in ModuleBuilderFn
 * @param rootWallet Sender of the funds
 * @param wallets Receivers of the funds
 * @param value
 */
export const filler = (
  m: ModuleBuilder,
  rootWallet: ethers.Wallet,
  wallets: ethers.Wallet[],
  value: ethers.BigNumber = ethers.utils.parseUnits('1', 'ether') as ethers.BigNumber,
): void => {
  m.onStart('on start distribute ethers to all accounts', async () => {
    for (let i = 0; i < wallets.length; i++) {
      await rootWallet.sendTransaction({
        from: rootWallet.getAddress(),
        to: wallets[i].getAddress(),
        value: value,
        gasLimit: 21000,
      });
    }
  });
};
