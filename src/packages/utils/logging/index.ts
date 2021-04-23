import { ModuleState } from '../../modules/states/module';
import { CliError, handleMappedErrorCodes, UserError } from '../../types/errors';
import { cli } from 'cli-ux';
import chalk from 'chalk';
import { checkIfExist } from '../util';

export enum Logging {
  'overview' = 'overview',
  'simple' = 'simple',
  'json' = 'json',
  'streamlined' = 'streamlined'
}

export enum StateElementStatus {
  'NOT_EXECUTED' = 'not executed',
  'STARTED' = 'started',
  'SUCCESSFUL' = 'successful',
  'DEPLOYED' = 'already executed/deployed',
  'FAILED' = 'failed',
}

export enum TransactionStatus {
  'EMPTY' = 0,
  'CONTRACT_TRANSACTION_SENT' = 1,
  'WAITING_FOR_CONFIRMATION'= 2,
  'TRANSACTION_CONFIRMED' = 3,
}

export interface ILogging {
  nothingToDeploy(): void;
  startModuleDeploy(moduleName: string,  moduleStates: ModuleState): void;
  finishModuleDeploy(moduleName: string, summary: string): void;
  alreadyDeployed(elementName: string): void;
  promptContinueDeployment(): Promise<void>;
  promptExecuteTx(): Promise<void>;
  promptSignedTransaction(tx: string): void;
  logError(error: Error): void;
  sendingTx(elementName: string, functionName?: string): void;
  sentTx(elementName: string, functionName?: string): void;
  bindingExecution(bindingName: string): void;
  finishedBindingExecution(bindingName: string): void;
  eventExecution(eventName: string): void;
  finishedEventExecution(eventName: string): void;
  executeContractFunction(contractFunction: string): void;
  finishedExecutionOfContractFunction(functionName: string): void;
  transactionReceipt(): void;
  waitTransactionConfirmation(): void;
  transactionConfirmation(confirmationNumber: number, elementName: string, functionName?: string): void;
  finishedExecutionOfWalletTransfer(from: string, to: string): void;
  executeWalletTransfer(address: string, to: string): void;
  generatedTypes(): void;
  startingModuleUsageGeneration(moduleName: string);
  finishedModuleUsageGeneration(moduleName: string);
  parallelizationExperimental();
  wrongNetwork();
  gasPriceIsLarge(backoffTime: number);
}

export function generateErrorMessage(error: Error): {
  message: string,
  stack: any,
} {
  let stack;
  if (cli.config.outputLevel == 'debug') {
    stack = error.stack;
  }

  if (
    (error as UserError)._isUserError ||
    (error as CliError)._isCliError
  ) {
    return {
      message: chalk.red(error.message),
      stack,
    };
  }

  // @ts-ignore
  if (checkIfExist(error?.code)) {
    // @TODO (filip) map all codes with meaningful message
    return {
      // @ts-ignore
      message: handleMappedErrorCodes(error?.code, error),
      stack,
    };
  }

  return {
    message: error.message,
    stack,
  };
}
