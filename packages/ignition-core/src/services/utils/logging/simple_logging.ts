import chalk from "chalk";
import { SingleBar } from "cli-progress";
import cli from "cli-ux";

import { EventType } from "../../../interfaces/hardhat_ignition";
import {
  CliError,
  DeniedConfirmation,
  ModuleContextMissingInLogger,
} from "../../types/errors";
import { ModuleState } from "../../types/module";
import { checkIfExist } from "../util";

import { FileLogging } from "./file_logging";
import { generateErrorMessage, ILogging } from "./index";

export enum StateElementStatus {
  "NOT_EXECUTED" = "not executed",
  "RUNNING" = "running",
  "SUCCESSFUL" = "successful",
  "DEPLOYED" = "already executed/deployed",
  "FAILED" = "failed",
}

enum DescActionList {
  "SKIPPED" = "skipped",
  "SUCCESSFUL" = "SUCCESSFUL",
  "CREATE" = "create",
  "LOWER_GAS_PRICE" = "waiting for lower gas price",
}

export class SimpleOverviewLogger extends FileLogging implements ILogging {
  private moduleBars: {
    [moduleName: string]: SingleBar;
  };

  private currentModuleName: string | undefined;

  constructor() {
    super();
    this.moduleBars = {};
  }

  public gasPriceIsLarge(backoffTime: number) {
    super.gasPriceIsLarge(backoffTime);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].update({
      action: DescActionList.LOWER_GAS_PRICE,
    });
  }

  public async parallelizationExperimental() {
    cli.info(
      chalk.yellow(
        "WARNING: This feature is experimental, please avoid using it while deploying to production"
      )
    );
    cli.confirm("Confirm you are willing to continue");
    const yes = await cli.confirm(
      "Do you wish to continue with deployment of this module? (Y/n)"
    );
    if (!yes) {
      throw new DeniedConfirmation("Confirmation has been declined.");
    }
  }

  public finishedExecutionOfWalletTransfer(from: string, to: string): void {
    super.finishedExecutionOfWalletTransfer(from, to);
  }

  public executeWalletTransfer(address: string, to: string): void {
    super.finishedExecutionOfWalletTransfer(address, to);
  }

  public startModuleDeploy(moduleName: string, moduleState: ModuleState): void {
    super.startModuleDeploy(moduleName, moduleState);

    this.currentModuleName = moduleName;
    cli.info(chalk.bold("\n\nDeploy module - ", chalk.green(moduleName)));

    this.moduleBars[moduleName] = new SingleBar({
      clearOnComplete: false,
      synchronousUpdate: true,
      fps: 100,
      format: `# ${chalk.bold(
        "{module}"
      )} | {percentage}% | {value}/{total} | Current element: ${chalk.bold(
        "{element}"
      )} -> status: {status} | Action: {action}`,
    });
    this.moduleBars[moduleName].start(Object.entries(moduleState).length, 0, {
      module: this.currentModuleName,
      element: "N/A",
      status: "N/A",
    });
  }

  public alreadyDeployed(elementName: string): void {
    super.alreadyDeployed(elementName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }

    this.moduleBars[this.currentModuleName].increment({
      module: this.currentModuleName,
      element: elementName,
      status: StateElementStatus.DEPLOYED,
      action: DescActionList.SKIPPED,
    });
  }

  public bindingExecution(bindingName: string): void {
    super.bindingExecution(bindingName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: bindingName,
      status: StateElementStatus.RUNNING,
      action: DescActionList.CREATE,
    });
  }

  public logError(error: Error): void {
    super.logError(error);
    if (!this?.currentModuleName) {
      return;
    }
    if (!this.moduleBars[this.currentModuleName]) {
      return;
    }

    this.moduleBars[this.currentModuleName].stop();
    const { message, stack } = generateErrorMessage(error);

    cli.info(message);
  }

  public eventExecution(eventName: string): void {
    super.eventExecution(eventName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: eventName,
      status: StateElementStatus.RUNNING,
      action: "N/A",
    });
  }

  public finishModuleDeploy(moduleName: string, summary: string): void {
    super.finishModuleDeploy(moduleName, summary);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: this.currentModuleName,
      status: StateElementStatus.SUCCESSFUL,
      action: "N/A",
    });
    this.moduleBars[this.currentModuleName].stop();

    this.currentModuleName = "";

    cli.info(summary);
  }

  public finishedEventExecution(eventName: string, eventType: EventType): void {
    super.finishedEventExecution(eventName, eventType);

    this.handleElementCompletion(eventName);
  }

  public finishedBindingExecution(bindingName: string): void {
    super.finishedBindingExecution(bindingName);

    this.handleElementCompletion(bindingName);
  }

  public finishedExecutionOfContractFunction(functionName: string): void {
    super.finishedExecutionOfContractFunction(functionName);
  }

  public nothingToDeploy(): void {
    super.nothingToDeploy();
    cli.info(
      "State file is up to date and their is nothing to be deployed, if you still want to trigger deploy use --help to see how."
    );
    cli.exit(0);
  }

  public promptContinueDeployment(): Promise<void> {
    // overview will not have confirmations
    return Promise.resolve();
  }

  public promptExecuteTx(): Promise<void> {
    // overview will not have metadata
    return Promise.resolve();
  }

  public promptSignedTransaction(tx: string): void {
    super.promptSignedTransaction(tx);
    // overview will not have metadata
    return;
  }

  public sendingTx(eventName: string, functionName: string = "CREATE"): void {
    super.sendingTx(eventName, functionName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    if (!checkIfExist(this.moduleBars[this.currentModuleName])) {
      throw new CliError(
        "Current module not found when trying to log transactions"
      );
    }

    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: eventName,
      status: StateElementStatus.RUNNING,
      action: `${functionName} -> sending`,
    });
  }

  public sentTx(eventName: string, functionName: string = "CREATE"): void {
    super.sentTx(eventName, functionName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }

    if (!checkIfExist(this.moduleBars[this.currentModuleName])) {
      throw new CliError(
        "Current module not found when trying to log transactions"
      );
    }

    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: eventName,
      status: StateElementStatus.RUNNING,
      action: `${functionName} -> sent`,
    });
  }

  public transactionConfirmation(
    confirmationNumber: number,
    eventName: string,
    functionName: string = "CREATE"
  ): void {
    super.transactionConfirmation(confirmationNumber, eventName, functionName);

    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    if (!checkIfExist(this.moduleBars[this.currentModuleName])) {
      throw new CliError(
        "Current module not found when trying to log transactions"
      );
    }

    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: eventName,
      status: StateElementStatus.RUNNING,
      action: `${functionName} -> confirmed ${confirmationNumber}`,
    });
  }

  public transactionReceipt(): void {
    super.transactionReceipt();
  }

  public waitTransactionConfirmation(): void {
    super.waitTransactionConfirmation();
  }

  public executeContractFunction(contractFunction: string): void {
    super.executeContractFunction(contractFunction);
  }

  public generatedTypes(): void {
    super.generatedTypes();
    cli.info(
      "Successfully generated module types, look under your deployments folder for .d.ts file."
    );
  }

  public finishedModuleUsageGeneration(moduleName: string) {
    super.finishedModuleUsageGeneration(moduleName);
  }

  public startingModuleUsageGeneration(moduleName: string) {
    super.startingModuleUsageGeneration(moduleName);
  }

  public async wrongNetwork(): Promise<boolean> {
    super.wrongNetwork();
    return cli.confirm(
      "Contracts are missing on the network, do you wish to continue? (Y/n)"
    );
  }

  public startModuleResolving(): void {}

  public finishModuleResolving(): void {}

  private handleElementCompletion(elementName: string): void {
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].increment({
      module: this.currentModuleName,
      element: elementName,
      status: StateElementStatus.SUCCESSFUL,
      action: "N/A",
    });
  }
}
