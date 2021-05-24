import { EventType } from "../../../interfaces/hardhat_ignition";

import { ILogging } from "./index";
import { ModuleState } from '../../types/module';

export class EmptyLogger implements ILogging {
  constructor() {}

  public alreadyDeployed(elementName: string): void {}

  public bindingExecution(bindingName: string): void {}

  public logError(): void {}

  public eventExecution(eventName: string): void {}

  public executeContractFunction(contractFunction: string): void {}

  public executeWalletTransfer(address: string, to: string): void {}

  public finishModuleDeploy(moduleName: string): void {}

  public finishedBindingExecution(bindingName: string): void {}

  public finishedEventExecution(
    eventName: string,
    eventType: EventType
  ): void {}

  public finishedExecutionOfContractFunction(functionName: string): void {}

  public finishedExecutionOfWalletTransfer(from: string, to: string): void {}

  public nothingToDeploy(): void {}

  public promptContinueDeployment(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public promptExecuteTx(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public promptSignedTransaction(tx: string): void {}

  public sendingTx(elementName: string, functionName?: string): void {}

  public sentTx(elementName: string, functionName?: string): void {}

  public startModuleDeploy(
    moduleName: string,
    moduleStates: ModuleState
  ): void {}

  public transactionConfirmation(
    confirmationNumber: number,
    elementName: string,
    functionName?: string
  ): void {}

  public transactionReceipt(): void {}

  public waitTransactionConfirmation(): void {}

  public generatedTypes(): void {}

  public finishedModuleUsageGeneration(moduleName: string) {}

  public startingModuleUsageGeneration(moduleName: string) {}

  public parallelizationExperimental() {}

  public async wrongNetwork(): Promise<boolean> {
    return false;
  }

  public gasPriceIsLarge(backoffTime: number) {}

  public finishModuleResolving(): void {}

  public startModuleResolving(): void {}

  public contractFunctionAlreadyExecuted(
    contractFunction: string,
    ...args: any[]
  ): void {}
}
