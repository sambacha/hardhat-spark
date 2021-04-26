import { ContractBinding, ContractInput, ModuleBuilder, StatefulEvent } from '../../interfaces/hardhat_ignition';
import { CliError, handleMappedErrorCodes, UserError } from '../types/errors';
import { cli } from 'cli-ux';
import chalk from 'chalk';
import * as os from 'os';

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

export function compareBytecode(bytecodeOne: string, bytecodeTwo: string): boolean {
  // https://docs.soliditylang.org/en/latest/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
  const metaDataLengthOne = parseInt(bytecodeOne.slice(-4), 16) * 2 + 4;
  const formattedBytecodeOne = bytecodeOne.substr(0, bytecodeOne.length - metaDataLengthOne);

  const metaDataLengthTwo = parseInt(bytecodeTwo.slice(-4), 16) * 2 + 4;
  const formattedBytecodeTwo = bytecodeTwo.slice(0, bytecodeTwo.length - metaDataLengthTwo);

  return formattedBytecodeOne == formattedBytecodeTwo;
}

export function checkIfSuitableForInstantiating(contractBinding: ContractBinding): boolean {
  return checkIfExist(contractBinding?.deployMetaData.contractAddress) &&
    checkIfExist(contractBinding?.abi) &&
    checkIfExist(contractBinding?.signer) &&
    checkIfExist(contractBinding?.prompter) &&
    checkIfExist(contractBinding?.txGenerator) &&
    checkIfExist(contractBinding?.moduleStateRepo);
}

export function arrayEquals(a: any[], b: any[]) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index]);
}

export function removeLastPathElement(path: string) {
  const pathElements = path.split('/');
  pathElements.pop();
  return (pathElements.join('/'));
}

export async function checkMutex(mutex: boolean, delayTime: number, retries: number) {
  if (retries === 0) {
    throw new Error('Maximum number of retries reached.');
  }

  if (mutex) {
    await delay(delayTime);
    await checkMutex(mutex, delayTime, retries - 1);
  }

  return;
}

function getOperatingSystem(): string {
  switch (os.type()) {
    case 'Windows_NT':
      return '(Windows NT 6.1; Win64; x64)';
    case 'Darwin':
      return '(Macintosh; Intel Mac OS X 10_13_6)';
    case 'Linux':
      return '(X11; Linux x86_64)';
    default:
      return '(Unknown)';
  }
}

export function getUserType(): string {
  return 'Developer'; // @TODO add CI here after we add integration
}

export function getUserAgent(): string {
  return `Node/${process.version} ${getOperatingSystem()}`;
}

export function moduleBuilderStatefulDiff(oldModuleBuilder: ModuleBuilder, newModuleBuilder: ModuleBuilder): ([string, ContractBinding][] | [string, StatefulEvent][])[] {
  const oldBindings = oldModuleBuilder.getAllBindings();
  const oldEvents = oldModuleBuilder.getAllEvents();

  const newBindings = newModuleBuilder.getAllBindings();
  const newEvents = newModuleBuilder.getAllEvents();

  const bindingsDiff = Object.entries(newBindings).splice(0, Object.entries(oldBindings).length);
  const eventsDiff = Object.entries(newEvents).splice(0, Object.entries(oldEvents).length);

  return [bindingsDiff, eventsDiff];
}

export function extractObjectInfo(obj: any): string {
  if (obj._isBigNumber) {
    return obj.toString();
  }

  if (obj._isContractBinding) {
    return `${obj.name}(${obj.deployMetaData.contractAddress})`;
  }

  if (obj._isContractBindingMetaData) {
    return obj.deployMetaData.contractAddress;
  }
}

export async function errorHandling(error: Error) {
  if (this.prompter) {
    this.prompter.errorPrompt(error);
  }

  if ((error as UserError)._isUserError) {
    if (cli.config.outputLevel == 'debug') {
      cli.debug(error.stack);
      return;
    }

    cli.info(chalk.red(error.message));
    return;
  }

  if ((error as CliError)._isCliError) {
    cli.info('Something went wrong inside ignition');
    if (cli.config.outputLevel == 'debug') {
      cli.debug(error.stack);
      return;
    }

    cli.info(chalk.red.bold('ERROR'), error.message);
    return;
  }

  // @ts-ignore
  if (checkIfExist(error?.code)) {
    // @TODO (filip) map all codes with meaningful message
    // @ts-ignore
    handleMappedErrorCodes(error.code, error);
  }

  cli.info(error.message);
  if (cli.config.outputLevel == 'debug') {
    cli.debug(error.stack);
  }
  this.analyticsService.reportError(error);
}
