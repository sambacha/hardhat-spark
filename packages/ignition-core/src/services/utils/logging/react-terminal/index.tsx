import chalk from "chalk";
import { cli } from "cli-ux";
import { render } from "ink";
import React, { ReactNode } from "react";

import { EventType } from "../../../../interfaces/hardhat-ignition";
import { ModuleContextMissingInLogger } from "../../../types/errors";
import { ElementStatus, ElementWithStatus } from "../../../types/logger";
import { ModuleState } from "../../../types/module";
import { getIgnitionVersion } from "../../package-info";
import { checkIfExist } from "../../util";
import { FileLogging } from "../file-logging";
import { generateErrorMessage, ILogging } from "../index";

import { ConfirmationQuestion } from "./ui/layout/confirmation-question";
import { TerminalLayout } from "./ui/layout/terminal";

export class OverviewLogger extends FileLogging implements ILogging {
  private readonly _rerender: {
    [moduleName: string]: (node: ReactNode) => void;
  };
  private readonly _clear: { [moduleName: string]: (node: ReactNode) => void };
  private readonly _cleanup: {
    [moduleName: string]: (node: ReactNode) => void;
  };

  private _showDeployment: boolean = false;
  private _moduleState: ModuleState | undefined;
  private readonly _ignitionVersion: string;
  private _numberOfExecutedElements: number = 0;
  private _totalNumberOfElements: number = 0;
  private _moduleElements: { [key: string]: ElementWithStatus } = {};

  constructor() {
    super();
    let version = getIgnitionVersion();
    if (version === undefined) {
      version = "v0";
    }
    this._ignitionVersion = version;

    this._rerender = {};
    this._clear = {};
    this._cleanup = {};
  }

  public alreadyDeployed(elementName: string): void {
    super.alreadyDeployed(elementName);

    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }

    this._moduleElements[elementName].status = ElementStatus.SUCCESSFULLY;

    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={""}
        summary={""}
      />
    );
  }

  public bindingExecution(bindingName: string): void {
    super.bindingExecution(bindingName);

    this._moduleElements[bindingName].status = ElementStatus.IN_PROGRESS;
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={""}
        summary={""}
      />
    );
  }

  public logError(error: Error): void {
    super.logError(error);

    const { message: errorMessage, stack: errorStack } = generateErrorMessage(
      error
    );
    this._showDeployment = false;

    if (!checkIfExist(this._moduleName)) {
      cli.info(chalk.red(errorMessage));
      if (cli.config.outputLevel === "debug") {
        cli.info(errorStack);
      }

      return;
    }
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={""}
        summary={""}
        errorMessage={errorMessage}
        errorStack={errorStack}
      />
    );
  }

  public eventExecution(eventName: string): void {
    super.eventExecution(eventName);

    this._moduleElements[eventName].status = ElementStatus.IN_PROGRESS;
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={""}
        summary={""}
      />
    );
  }

  public executeContractFunction(contractFunction: string): void {
    super.executeContractFunction(contractFunction);
  }

  public executeWalletTransfer(address: string, to: string): void {
    super.executeWalletTransfer(address, to);
  }

  public finishModuleDeploy(moduleName: string, summary: string): void {
    super.finishModuleDeploy(moduleName, summary);
    if (
      this._rerender[moduleName] === undefined &&
      !checkIfExist(this._rerender[moduleName])
    ) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={""}
        summary={summary}
      />
    );
  }

  public finishedBindingExecution(bindingName: string): void {
    super.finishedBindingExecution(bindingName);

    this._numberOfExecutedElements += 1;
    this._moduleElements[bindingName].status = ElementStatus.SUCCESSFULLY;
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={""}
        summary={""}
      />
    );
  }

  public finishedEventExecution(eventName: string, eventType: EventType): void {
    super.finishedEventExecution(eventName, eventType);
    if (eventType === EventType.ON_FAIL) {
      return;
    }

    this._numberOfExecutedElements += 1;
    this._moduleElements[eventName].status = ElementStatus.SUCCESSFULLY;
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={""}
        summary={""}
      />
    );
  }

  public finishedExecutionOfContractFunction(functionName: string): void {
    super.finishedExecutionOfContractFunction(functionName);
  }

  public finishedExecutionOfWalletTransfer(from: string, to: string): void {
    super.finishedExecutionOfWalletTransfer(from, to);
  }

  public finishedModuleUsageGeneration(moduleName: string) {
    super.finishedModuleUsageGeneration(moduleName);
  }

  public gasPriceIsLarge(backoffTime: number) {
    super.gasPriceIsLarge(backoffTime);
  }

  public generatedTypes(): void {
    super.generatedTypes();
  }

  public nothingToDeploy(): void {
    super.nothingToDeploy();
  }

  public parallelizationExperimental(): Promise<boolean> {
    return new Promise((resolve) => {
      super.parallelizationExperimental();

      render(
        <ConfirmationQuestion
          userPrompt={`${chalk.yellow(
            "WARNING: This feature is experimental, please avoid using it while deploying to production"
          )}
Confirm you are willing to continue?`}
          resolve={resolve}
        />
      );
    });
  }

  public promptContinueDeployment(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public promptExecuteTx(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public promptSignedTransaction(tx: string): void {
    super.promptSignedTransaction(tx);
  }

  public sendingTx(elementName: string, functionName: string = "CREATE"): void {
    super.sendingTx(elementName, functionName);

    const transactionStatus = "Sending tx...";
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={transactionStatus}
        summary={""}
      />
    );
  }

  public sentTx(elementName: string, functionName: string = "CREATE"): void {
    super.sentTx(elementName, functionName);

    const transactionStatus = "Sent tx...";
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={transactionStatus}
        summary={""}
      />
    );
  }

  public startModuleDeploy(
    moduleName: string,
    moduleStates: ModuleState
  ): void {
    super.startModuleDeploy(moduleName, moduleStates);

    this._showDeployment = true;
    this._moduleState = moduleStates;
    this._moduleName = moduleName;
    this._moduleElements = hydrateModuleWithStatus(moduleStates);

    this._totalNumberOfElements = Object.entries(this._moduleElements).length;
    this._numberOfExecutedElements = 0;

    const { rerender, cleanup, clear } = render(
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={""}
        summary={""}
      />
    );

    this._rerender[moduleName] = rerender;
    this._clear[moduleName] = clear;
    this._cleanup[this._moduleName] = cleanup;
  }

  public startingModuleUsageGeneration(moduleName: string) {
    super.startingModuleUsageGeneration(moduleName);
  }

  public transactionConfirmation(
    confirmationNumber: number,
    elementName: string,
    functionName: string = "CREATE"
  ): void {
    super.transactionConfirmation(
      confirmationNumber,
      elementName,
      functionName
    );

    const transactionStatus = `Waiting for block...`;
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={transactionStatus}
        summary={""}
      />
    );
  }

  public transactionReceipt(): void {
    super.transactionReceipt();
  }

  public waitTransactionConfirmation(): void {
    super.waitTransactionConfirmation();
    const transactionStatus = "Waiting for block...";
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._rerender[this._moduleName](
      <TerminalLayout
        showDeployment={this._showDeployment}
        ignitionVersion={this._ignitionVersion}
        moduleName={this._moduleName}
        numberOfExecutedElements={this._numberOfExecutedElements}
        totalNumberOfElements={this._totalNumberOfElements}
        moduleElementsWithStatus={this._moduleElements}
        transactionStatus={transactionStatus}
        summary={""}
      />
    );
  }

  public async wrongNetwork(): Promise<boolean> {
    return new Promise(async (resolve) => {
      await super.wrongNetwork();

      render(
        <ConfirmationQuestion
          userPrompt={
            "Contracts are missing on the network, do you wish to continue?"
          }
          resolve={resolve}
        />
      );
    });
  }

  public startModuleResolving(moduleName: string): void {}

  public finishModuleResolving(moduleName: string): void {}

  public contractFunctionAlreadyExecuted(
    contractFunction: string,
    ...args: any[]
  ): void {}
}

function hydrateModuleWithStatus(
  moduleState: ModuleState
): { [key: string]: ElementWithStatus } {
  const moduleWithStatus: { [key: string]: ElementWithStatus } = {};
  for (const [key, value] of Object.entries(moduleState)) {
    moduleWithStatus[key] = {
      element: value,
      status: ElementStatus.EMPTY,
    };
  }

  return moduleWithStatus;
}
