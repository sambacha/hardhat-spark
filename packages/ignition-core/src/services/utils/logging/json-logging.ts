import { cli } from "cli-ux";

import { EventType } from "../../../interfaces/hardhat-ignition";
import { ModuleState } from "../../types/module";

import { generateErrorMessage, ILogging } from "./index";

export class JsonLogger implements ILogging {
  private _currentModuleName: string | undefined;

  constructor() {}

  public alreadyDeployed(elementName: string): void {
    cli.info(
      JSON.stringify({
        name: "Already deployed",
        fields: {
          elementName,
        },
      })
    );
  }

  public bindingExecution(bindingName: string): void {
    cli.info(
      JSON.stringify({
        name: "Started deploying binding",
        fields: {
          bindingName,
        },
      })
    );
  }

  public logError(error: Error): void {
    const { message, stack } = generateErrorMessage(error);

    cli.error(
      JSON.stringify({
        name: "Error",
        fields: {
          message,
          stack,
        },
      })
    );
  }

  public eventExecution(eventName: string): void {
    cli.info(
      JSON.stringify({
        name: "Started executing event",
        fields: {
          eventName,
        },
      })
    );
  }

  public executeContractFunction(contractFunction: string): void {
    cli.info(
      JSON.stringify({
        name: "Started executing contract function",
        fields: {
          contractFunction,
        },
      })
    );
  }

  public executeWalletTransfer(from: string, to: string): void {
    cli.info(
      JSON.stringify({
        name: "Executed wallet transaction",
        fields: {
          from,
          to,
        },
      })
    );
  }

  public finishModuleDeploy(): void {
    cli.info(
      JSON.stringify({
        name: "Finished module deployment",
        fields: {
          moduleName: this._currentModuleName,
        },
      })
    );
  }

  public finishedBindingExecution(bindingName: string): void {
    cli.info(
      JSON.stringify({
        name: "Finished binding deployment",
        fields: {
          bindingName,
        },
      })
    );
  }

  public finishedEventExecution(eventName: string, eventType: EventType): void {
    cli.info(
      JSON.stringify({
        name: "Finished event execution",
        fields: {
          eventName,
          eventType,
        },
      })
    );
  }

  public finishedExecutionOfContractFunction(functionName: string): void {
    cli.info(
      JSON.stringify({
        name: "Finished execution of contract function",
        fields: {
          functionName,
        },
      })
    );
  }

  public finishedExecutionOfWalletTransfer(from: string, to: string): void {
    cli.info(
      JSON.stringify({
        name: "Finished execution of wallet transaction",
        fields: {
          from,
          to,
        },
      })
    );
  }

  public nothingToDeploy(): void {
    cli.info(
      JSON.stringify({
        name: "Nothing to deploy",
        fields: {
          moduleName: this._currentModuleName,
        },
      })
    );
  }

  public promptContinueDeployment(): Promise<void> {
    return Promise.resolve();
  }

  public promptExecuteTx(): Promise<void> {
    return Promise.resolve();
  }

  public promptSignedTransaction(tx: string): void {
    cli.info(
      JSON.stringify({
        name: "Singed tx",
        fields: {
          singedTx: tx,
        },
      })
    );
  }

  public sendingTx(elementName: string, functionName?: string): void {
    cli.info(
      JSON.stringify({
        name: "Sending transaction for contract",
        fields: {
          elementName,
          functionName,
        },
      })
    );
  }

  public sentTx(elementName: string, functionName: string = "CREATE"): void {
    cli.info(
      JSON.stringify({
        name: "Sent transaction for contract",
        fields: {
          elementName,
          functionName,
        },
      })
    );
  }

  public startModuleDeploy(
    moduleName: string,
    _moduleStates: ModuleState
  ): void {
    cli.info(
      JSON.stringify({
        name: "Started module deployment",
        fields: {
          moduleName,
        },
      })
    );
    this._currentModuleName = moduleName;
  }

  public transactionConfirmation(
    confirmationNumber: number,
    elementName: string,
    functionName: string = "CREATE"
  ): void {
    cli.info(
      JSON.stringify({
        name: "Transaction confirmation",
        fields: {
          confirmationNumber,
          elementName,
          functionName,
        },
      })
    );
  }

  public transactionReceipt(): void {}

  public waitTransactionConfirmation(): void {}

  public generatedTypes(): void {
    cli.info(
      JSON.stringify({
        name: "Successfully generated module types",
      })
    );
  }

  public finishedModuleUsageGeneration(_moduleName: string) {}

  public startingModuleUsageGeneration(_moduleName: string) {}

  public async parallelizationExperimental() {}

  public wrongNetwork(): Promise<boolean> {
    return Promise.resolve(true);
  }

  public gasPriceIsLarge(backoffTime: number) {
    cli.info(
      JSON.stringify({
        name: "Gas price is too large, waiting to gets lower.",
        fields: backoffTime,
      })
    );
  }

  public finishModuleResolving(): void {}

  public startModuleResolving(): void {}

  public contractFunctionAlreadyExecuted(
    _contractFunction: string,
    ..._args: any[]
  ): void {}
}
