import { ContractFunction } from '@ethersproject/contracts/src.ts/index';
import { checkIfExist } from '../../packages/utils/util';
import { UserError } from '../../packages/types/errors';
import { ethers } from 'ethers';
import { ContractBinding } from '../mortar';

export async function expectFuncRead(expectedValue: ContractBinding | any | undefined, readFunc: ContractFunction | any, ...readArgs: any): Promise<boolean> {
  const value = await readFunc(...readArgs);
  if (!checkIfExist(expectedValue)) {
    if (checkIfExist(value)) {
      return true;
    }

    throw new UserError(`Failed on expectFuncRead - couldn't match ${expectedValue} with ${value}`);
  }

  if (expectedValue instanceof ContractBinding
    && value == expectedValue.deployMetaData.contractAddress) {
    return true;
  }

  if (checkIfExist(value.length) && checkIfExist(expectedValue.length)
    && value.length != 0 && expectedValue.length != 0) {
    if (value.length != expectedValue.length) {
      throw new UserError(`Failed on expectFuncRead - couldn't match ${expectedValue} with ${value}`);
    }

    for (let i = 0; i < value.length; i++) {
      if (value[i] != expectedValue[i]) {
        throw new UserError(`Failed on expectFuncRead - couldn't match ${expectedValue} with ${value}`);
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

  if (expectedValue == value) {
    return true;
  }


  throw new UserError(`Failed on expectFuncRead - couldn't match ${expectedValue} with ${value}`);
}

export async function gracefulExpectFuncRead(expectedValue: ContractBinding | any, readFunc: ContractFunction, ...readArgs: any): Promise<boolean> {
  const value = await readFunc(...readArgs);
  if (!checkIfExist(expectedValue)) {
    return checkIfExist(value);
  }

  if (expectedValue instanceof ContractBinding
    && value == expectedValue.deployMetaData.contractAddress) {
    return true;
  }

  if (checkIfExist(value.length) && checkIfExist(expectedValue.length)
    && value.length != 0 && expectedValue.length != 0) {
    if (value.length != expectedValue.length) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      if (value[i] != expectedValue[i]) {
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

  return expectedValue == value;
}

export function expect(firstValue: any, secondValue: any): boolean {
  if (firstValue == secondValue) {
    return true;
  }

  throw new UserError(`Failed on expectFuncRead - couldn't match ${firstValue} with ${secondValue}`);
}

export function gracefulExpect(firstValue: any, secondValue: any): boolean {
  return firstValue == secondValue;
}
