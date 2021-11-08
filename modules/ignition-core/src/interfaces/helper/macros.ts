import { ethers } from "ethers";

import { checkIfExist } from "../../services/utils/util";
import {
  ContractBinding,
  ContractEvent,
  ModuleBuilder,
} from "../hardhat-ignition";

import { expectFuncRead, expectSlotRead } from "./expectancy";

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
    eventName?: string;
    getterFunc?: string;
    getterArgs?: any[];
    expectedValue?: any;
    deps?: Array<ContractBinding | ContractEvent>;
    slot?: string;
  }
): ContractEvent => {
  const eventName = opts?.eventName ?? `mutator${setterFunc}${setter.name}`;
  const getFunc = setterFunc.substring(3);
  const getterFunc =
    opts?.getterFunc ?? `${getFunc[0].toLowerCase() + getFunc.slice(1)}`;

  const deps = [];
  if (opts?.deps !== undefined) {
    deps.push(...opts.deps);
  }

  const usages: Array<ContractBinding | ContractEvent> = [];
  for (const arg of setterArgs) {
    if (arg?._isContractBinding !== undefined || checkIfExist(arg?.eventType)) {
      usages.push(arg);
    }
  }

  const value = setterArgs.pop();
  const keys = setterArgs;
  const getterArgs = opts?.getterArgs ?? keys;
  const expectedValue = opts?.expectedValue ?? value;

  return m.group(setter, ...deps).afterDeploy(
    m,
    eventName,
    async (): Promise<void> => {
      await setter.deployed()[`${setterFunc}`](...keys, value);

      if (opts?.slot !== undefined) {
        await expectSlotRead(expectedValue, setter.deployed(), opts.slot);
        return;
      }

      await expectFuncRead(
        expectedValue,
        setter.deployed()[getterFunc],
        ...getterArgs
      );
    },
    ...usages
  );
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
  rootWallet: ethers.Signer,
  wallets: ethers.Signer[],
  value?: ethers.BigNumberish | any
): void => {
  if (!value) {
    value = ethers.utils.parseUnits("1", "ether") as ethers.BigNumber;
  }
  m.onStart("on start distribute ethers to all accounts", async () => {
    for (const wallet of wallets) {
      await rootWallet.sendTransaction({
        from: await rootWallet.getAddress(),
        to: await wallet.getAddress(),
        value,
        gasLimit: 21000,
      });
    }
  });
};
