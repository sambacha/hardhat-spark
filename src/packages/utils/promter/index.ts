import { ModuleState } from '../../modules/states/module';

export enum Prompters {
  'overview' = 'overview',
  'simple' = 'simple',
  'json' = 'json',
  'streamlined' = 'streamlined'
}

export interface IPrompter {
  nothingToDeploy(): void;
  startModuleDeploy(moduleName: string,  moduleStates: ModuleState): void;
  finishModuleDeploy(): void;
  alreadyDeployed(elementName: string): void;
  promptContinueDeployment(): Promise<void>;
  promptExecuteTx(): Promise<void>;
  promptSignedTransaction(tx: string): void;
  errorPrompt(): void;
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
}
