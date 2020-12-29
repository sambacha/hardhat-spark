import { ContractBinding, ContractInput } from '../../interfaces/mortar';

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function checkIfExist(object: any): boolean {
  return object != undefined && typeof object != 'undefined';
}

export function checkIfFuncExist(func: any): boolean {
  return typeof func === 'function';
}

export function checkIfSameInputs(input: ContractInput, fragmentName: string, args: any[]): boolean {
  return input.functionName === fragmentName && arrayEquals(input.inputs, args);
}

export function checkIfSuitableForInstantiating(contractBinding: ContractBinding): boolean {
  return checkIfExist(contractBinding?.deployMetaData.contractAddress) &&
    checkIfExist(contractBinding?.abi) &&
    checkIfExist(contractBinding?.signer) &&
    checkIfExist(contractBinding?.prompter) &&
    checkIfExist(contractBinding?.txGenerator) &&
    checkIfExist(contractBinding?.moduleStateRepo);
}

function arrayEquals(a: any[], b: any[]) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index]);
}

export async function checkMutex(mutex: boolean, delayTime: number, retries: number) {
  if (retries === 0) {
    throw new Error('Maximum number of retries reached.');
  }

  if (mutex) {
    await delay(delayTime);
    await checkMutex(mutex, delayTime * 2, retries - 1);
  }

  return;
}
