import { ContractFunction } from "@ethersproject/contracts";
import { ethers } from "ethers";

import {
  UnexpectedValueError,
  ValueMismatch,
} from "../../services/types/errors";
import { checkIfExist } from "../../services/utils/util";
import { ContractBinding } from "../hardhat-ignition";

/**
 * This function is checking if `get_StorageAt` call for `slot` in `contract` is same as `expectedValue`.
 * @param expectedValue Expected value to be returned.
 * @param contract Contract for slot is going to be read.
 * @param slot Slot value.
 *
 * @returns Promise<boolean>
 */
export async function expectSlotRead(
  expectedValue: ContractBinding | any | undefined,
  contract: ethers.Contract,
  slot: string | any
): Promise<boolean> {
  const value = (
    await contract.provider.getStorageAt(contract.address, slot)
  ).toLowerCase();
  if (!checkIfExist(expectedValue)) {
    if (checkIfExist(value)) {
      return true;
    }

    throw new ValueMismatch(expectedValue, value);
  }

  if (expectedValue._isContractBinding) {
    const address = expectedValue.deployMetaData.contractAddress.toLowerCase();
    const slotAddress = `0x${value.substr(26)}`;

    if (slotAddress === address) {
      return true;
    }
  }

  if (
    checkIfExist(value.length) &&
    checkIfExist(expectedValue.length) &&
    value.length !== 0 &&
    expectedValue.length !== 0
  ) {
    if (value.length !== expectedValue.length) {
      throw new ValueMismatch(expectedValue, value);
    }

    for (let i = 0; i < value.length; i++) {
      if (value[i] !== expectedValue[i]) {
        throw new ValueMismatch(expectedValue, value);
      }
    }

    return true;
  }

  if (expectedValue instanceof ethers.BigNumber) {
    if (expectedValue.eq(value)) {
      return true;
    }
  }

  if (expectedValue._isBigNumber) {
    if (expectedValue.eq(value)) {
      return true;
    }
  }

  if (expectedValue === value) {
    return true;
  }

  throw new UnexpectedValueError(expectedValue, value);
}

/**
 * This function is checking if `readFunc` with `readArgs` for `contract` is same as `expectedValue`. In case of error it
 * would throw ValueMismatch.
 *
 * @param expectedValue Expected value to be returned.
 * @param readFunc Read function name without arguments and braces.
 * @param readArgs Read function arguments.
 *
 * @returns Promise<boolean>
 */
export async function expectFuncRead(
  expectedValue: ContractBinding | any | undefined,
  readFunc: ContractFunction | any,
  ...readArgs: any
): Promise<boolean> {
  const value = await readFunc(...readArgs);
  if (!checkIfExist(expectedValue)) {
    if (checkIfExist(value)) {
      return true;
    }

    throw new ValueMismatch(expectedValue, value);
  }

  if (
    expectedValue._isContractBinding &&
    value === expectedValue.deployMetaData.contractAddress
  ) {
    return true;
  }

  if (
    checkIfExist(value.length) &&
    checkIfExist(expectedValue.length) &&
    value.length !== 0 &&
    expectedValue.length !== 0
  ) {
    if (value.length !== expectedValue.length) {
      throw new ValueMismatch(expectedValue, value);
    }

    for (let i = 0; i < value.length; i++) {
      if (value[i] !== expectedValue[i]) {
        throw new ValueMismatch(expectedValue, value);
      }
    }

    return true;
  }

  if (expectedValue instanceof ethers.BigNumber) {
    if (expectedValue.eq(value)) {
      return true;
    }
  }

  if (value instanceof ethers.BigNumber) {
    if (value.eq(expectedValue)) {
      return true;
    }
  }

  if (expectedValue._isBigNumber) {
    if (expectedValue.eq(value)) {
      return true;
    }
  }

  if (value._isBigNumber) {
    if (value.eq(expectedValue)) {
      return true;
    }
  }

  if (expectedValue === value) {
    return true;
  }

  throw new UnexpectedValueError(expectedValue, value);
}

/**
 * Same as expectFuncRead but it would not throw Error, but rather return true or false.
 *
 * @param expectedValue
 * @param readFunc
 * @param readArgs
 *
 * @returns Promise<boolean> true if expectedValue is equal to readFunc value, otherwise false.
 */
export async function gracefulExpectFuncRead(
  expectedValue: ContractBinding | any,
  readFunc: ContractFunction,
  ...readArgs: any
): Promise<boolean> {
  const value = await readFunc(...readArgs);
  if (!checkIfExist(expectedValue)) {
    return checkIfExist(value);
  }

  if (
    expectedValue._isContractBinding &&
    value === expectedValue.deployMetaData.contractAddress
  ) {
    return true;
  }

  if (
    checkIfExist(value.length) &&
    checkIfExist(expectedValue.length) &&
    value.length !== 0 &&
    expectedValue.length !== 0
  ) {
    if (value.length !== expectedValue.length) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      if (value[i] !== expectedValue[i]) {
        return false;
      }
    }

    return true;
  }

  if (expectedValue instanceof ethers.BigNumber) {
    if (expectedValue.eq(value)) {
      return true;
    }
  }

  if (value instanceof ethers.BigNumber) {
    if (value.eq(expectedValue)) {
      return true;
    }
  }

  if (expectedValue._isBigNumber) {
    if (expectedValue.eq(value)) {
      return true;
    }
  }

  if (value._isBigNumber) {
    if (value.eq(expectedValue)) {
      return true;
    }
  }

  return expectedValue === value;
}

/**
 * Comparing firstValue with secondValue and throwing error in case they don't match.
 * @param firstValue
 * @param secondValue
 *
 * @returns boolean
 */
export function expect(firstValue: any, secondValue: any): boolean {
  if (firstValue === secondValue) {
    return true;
  }

  throw new UnexpectedValueError(firstValue, secondValue);
}

/**
 * Comparing firstValue with secondValue.
 *
 * @param firstValue
 * @param secondValue
 *
 * @returns boolean
 */
export function gracefulExpect(firstValue: any, secondValue: any): boolean {
  return firstValue === secondValue;
}
