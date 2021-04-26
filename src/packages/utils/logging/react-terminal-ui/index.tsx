import React, { FC } from 'react';
import { render, Text } from 'ink';
import { TerminalLayout } from './ui/layout/terminal';
import { ModuleState } from '../../../modules/states/module';
import { ILogging } from '../index';
import { getIgnitionVersion } from '../../package_info';
import { ContractBinding, EventType, StatefulEvent } from '../../../../interfaces/hardhat_ignition';
import { FileLogging } from '../file_logging';
import { checkIfExist } from '../../util';

export enum ElementStatus {
  'EMPTY' = 'EMPTY',
  'IN_PROGRESS' = 'IN_PROGRESS',
  'SUCCESSFULLY' = 'SUCCESSFULLY',
}

export type ElementWithStatus = {
  element: (ContractBinding | StatefulEvent);
  status: ElementStatus;
};

// @ts-ignore
export class OverviewPrompter extends FileLogging implements ILogging {
  private readonly rerender: { [moduleName: string]: FC };
  private readonly clear: { [moduleName: string]: FC };

  private showDeployment: boolean = false;
  private moduleState: ModuleState;
  private readonly ignitionVersion: string;
  private numberOfExecutedElements: number = 0;
  private totalNumberOfElements: number = 0;
  private moduleElements: { [key: string]: ElementWithStatus } = {};

  private moduleName: string;

  constructor() {
    super();
    this.ignitionVersion = getIgnitionVersion();

    this.rerender = {};
    this.clear = {};
  }

  alreadyDeployed(elementName: string): void {
    super.alreadyDeployed(elementName);

    this.moduleElements[elementName].status = ElementStatus.SUCCESSFULLY;

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={''}
      summary={''}
    />);
  }

  bindingExecution(bindingName: string): void {
    super.bindingExecution(bindingName);

    this.moduleElements[bindingName].status = ElementStatus.IN_PROGRESS;

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={''}
      summary={''}
    />);
  }

  errorPrompt(error: Error): void {
    super.errorPrompt(error);
    if (checkIfExist(this.moduleName)) {
      this.clear[this.moduleName]();
    }
  }

  eventExecution(eventName: string): void {
    super.eventExecution(eventName);

    this.moduleElements[eventName].status = ElementStatus.IN_PROGRESS;

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={''}
      summary={''}
    />);
  }

  executeContractFunction(contractFunction: string): void {
    super.executeContractFunction(contractFunction);
  }

  executeWalletTransfer(address: string, to: string): void {
    super.executeWalletTransfer(address, to);
  }

  finishModuleDeploy(moduleName: string, summary: string): void {
    super.finishModuleDeploy(moduleName, summary);

    this.rerender[moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={''}
      summary={summary}
    />);

    this.rerender[moduleName] = undefined;
  }

  finishedBindingExecution(bindingName: string): void {
    super.finishedBindingExecution(bindingName);

    this.numberOfExecutedElements += 1;
    this.moduleElements[bindingName].status = ElementStatus.SUCCESSFULLY;

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={''}
      summary={''}
    />);
  }

  finishedEventExecution(eventName: string): void {
    super.finishedEventExecution(eventName);
    if (eventName == EventType.OnFail) {
      return;
    }

    this.numberOfExecutedElements += 1;
    this.moduleElements[eventName].status = ElementStatus.SUCCESSFULLY;

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={''}
      summary={''}
    />);
  }

  finishedExecutionOfContractFunction(functionName: string): void {
    super.finishedExecutionOfContractFunction(functionName);
  }

  finishedExecutionOfWalletTransfer(from: string, to: string): void {
    super.finishedExecutionOfWalletTransfer(from, to);
  }

  finishedModuleUsageGeneration(moduleName: string) {
    super.finishedModuleUsageGeneration(moduleName);
  }

  gasPriceIsLarge(backoffTime: number) {
    super.gasPriceIsLarge(backoffTime);
  }

  generatedTypes(): void {
    super.generatedTypes();
  }

  nothingToDeploy(): void {
    super.nothingToDeploy();
  }

  parallelizationExperimental() {
    super.parallelizationExperimental();
  }

  promptContinueDeployment(): Promise<void> {
    return Promise.resolve(undefined);
  }

  promptExecuteTx(): Promise<void> {
    return Promise.resolve(undefined);
  }

  promptSignedTransaction(tx: string): void {
    super.promptSignedTransaction(tx);
  }

  sendingTx(elementName: string, functionName: string = 'CREATE'): void {
    super.sendingTx(elementName, functionName);

    const transactionStatus = 'Sending tx...';

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={transactionStatus}
      summary={''}
    />);
  }

  sentTx(elementName: string, functionName: string = 'CREATE'): void {
    super.sentTx(elementName, functionName);

    const transactionStatus = 'Sent tx...';

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={transactionStatus}
      summary={''}
    />);
  }

  startModuleDeploy(moduleName: string, moduleStates: ModuleState): void {
    super.startModuleDeploy(moduleName, moduleStates);

    this.showDeployment = true;
    this.moduleState = moduleStates;
    this.moduleName = moduleName;
    this.moduleElements = hydrateModuleWithStatus(moduleStates);

    this.totalNumberOfElements = Object.entries(this.moduleElements).length;
    this.numberOfExecutedElements = 0;

    const {
      rerender,
      cleanup,
      clear,
    } = render(<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={''}
      summary={''}
    />);

    this.rerender[moduleName] = rerender;
    this.clear[moduleName] = clear;
  }

  startingModuleUsageGeneration(moduleName: string) {
    super.startingModuleUsageGeneration(moduleName);
  }

  transactionConfirmation(confirmationNumber: number, elementName: string, functionName: string = 'CREATE'): void {
    super.transactionConfirmation(confirmationNumber, elementName, functionName);

    const transactionStatus = `Waiting for block...`;

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={transactionStatus}
      summary={''}
    />);
  }

  transactionReceipt(): void {
    super.transactionReceipt();
  }

  waitTransactionConfirmation(): void {
    super.waitTransactionConfirmation();
    const transactionStatus = 'Waiting for block...';

    this.rerender[this.moduleName](<TerminalLayout
      showDeployment={this.showDeployment}
      ignitionVersion={this.ignitionVersion}
      moduleName={this.moduleName}
      numberOfExecutedElements={this.numberOfExecutedElements}
      totalNumberOfElements={this.totalNumberOfElements}
      moduleElementsWithStatus={this.moduleElements}
      transactionStatus={transactionStatus}
      summary={''}
    />);
  }

  wrongNetwork() {
    super.wrongNetwork();
  }
}

function hydrateModuleWithStatus(moduleState: ModuleState): { [key: string]: ElementWithStatus } {
  const moduleWithStatus: { [key: string]: ElementWithStatus } = {};
  for (const [key, value] of Object.entries(moduleState)) {
    moduleWithStatus[key] = {
      element: value,
      status: ElementStatus.EMPTY,
    };
  }

  return moduleWithStatus;
}
