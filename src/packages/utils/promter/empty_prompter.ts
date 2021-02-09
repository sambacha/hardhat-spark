import { IPrompter } from './index';
import { ModuleState } from '../../modules/states/module';

export class EmptyPrompter implements IPrompter {
  alreadyDeployed(elementName: string): void {
  }

  bindingExecution(bindingName: string): void {
  }

  errorPrompt(): void {
  }

  eventExecution(eventName: string): void {
  }

  executeContractFunction(contractFunction: string): void {
  }

  executeWalletTransfer(address: string, to: string): void {
  }

  finishModuleDeploy(moduleName: string): void {
  }

  finishedBindingExecution(bindingName: string): void {
  }

  finishedEventExecution(eventName: string): void {
  }

  finishedExecutionOfContractFunction(functionName: string): void {
  }

  finishedExecutionOfWalletTransfer(from: string, to: string): void {
  }

  nothingToDeploy(): void {
  }

  promptContinueDeployment(): Promise<void> {
    return Promise.resolve(undefined);
  }

  promptExecuteTx(): Promise<void> {
    return Promise.resolve(undefined);
  }

  promptSignedTransaction(tx: string): void {
  }

  sendingTx(elementName: string, functionName?: string): void {
  }

  sentTx(elementName: string, functionName?: string): void {
  }

  startModuleDeploy(moduleName: string, moduleStates: ModuleState): void {
  }

  transactionConfirmation(confirmationNumber: number, elementName: string, functionName?: string): void {
  }

  transactionReceipt(): void {
  }

  waitTransactionConfirmation(): void {
  }

}
