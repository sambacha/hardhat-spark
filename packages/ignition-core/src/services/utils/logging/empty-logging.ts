import { EventType } from "../../../interfaces/hardhat-ignition";
import { ModuleState } from "../../types/module";

import { ILogging } from "./index";

export class EmptyLogger implements ILogging {
  constructor() {}

  public alreadyDeployed(_elementName: string): void {}

  public bindingExecution(_bindingName: string): void {}

  public logError(): void {}

  public eventExecution(_eventName: string): void {}

  public executeContractFunction(_contractFunction: string): void {}

  public executeWalletTransfer(_address: string, _to: string): void {}

  public finishModuleDeploy(_moduleName: string): void {}

  public finishedBindingExecution(_bindingName: string): void {}

  public finishedEventExecution(
    _eventName: string,
    _eventType: EventType
  ): void {}

  public finishedExecutionOfContractFunction(_functionName: string): void {}

  public finishedExecutionOfWalletTransfer(_from: string, _to: string): void {}

  public nothingToDeploy(): void {}

  public promptContinueDeployment(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public promptExecuteTx(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public promptSignedTransaction(_tx: string): void {}

  public sendingTx(_elementName: string, _functionName?: string): void {}

  public sentTx(_elementName: string, _functionName?: string): void {}

  public startModuleDeploy(
    _moduleName: string,
    _moduleStates: ModuleState
  ): void {}

  public transactionConfirmation(
    _confirmationNumber: number,
    _elementName: string,
    _functionName?: string
  ): void {}

  public transactionReceipt(): void {}

  public waitTransactionConfirmation(): void {}

  public generatedTypes(): void {}

  public finishedModuleUsageGeneration(_moduleName: string) {}

  public startingModuleUsageGeneration(_moduleName: string) {}

  public parallelizationExperimental() {}

  public async wrongNetwork(): Promise<boolean> {
    return false;
  }

  public gasPriceIsLarge(_backoffTime: number) {}

  public finishModuleResolving(): void {}

  public startModuleResolving(): void {}

  public contractFunctionAlreadyExecuted(
    _contractFunction: string,
    ..._args: any[]
  ): void {}
}
