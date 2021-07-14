import chalk from "chalk";
import cli from "cli-ux";

import { EventType } from "../../../interfaces/hardhat-ignition";
import { DeniedConfirmation } from "../../types/errors";
import { ModuleState } from "../../types/module";

import { generateErrorMessage, ILogging } from "./index";

export class StreamlinedLogger implements ILogging {
  private _whitespaces: string;
  private readonly _skipConfirmation: boolean;

  constructor(skipConfirmation: boolean = false) {
    this._skipConfirmation = skipConfirmation;
    this._whitespaces = "";
  }

  public generatedTypes(): void {
    cli.info(
      "Successfully generated module types, look for .d.ts file in your deployment folder."
    );
  }

  public nothingToDeploy(): void {
    cli.info(
      "State file is up to date and their is nothing to be deployed, if you still want to trigger deploy use --help to see how."
    );
    cli.exit(0);
  }

  public startModuleDeploy(
    moduleName: string,
    _moduleStates: ModuleState
  ): void {
    cli.info(chalk.bold("\nDeploy module - ", chalk.green(moduleName)));
    this._whitespaces += "  ";
  }

  public finishModuleDeploy(moduleName: string, summary: string): void {
    this._finishedElementExecution();
    cli.info(summary);
  }

  public alreadyDeployed(elementName: string): void {
    cli.info(
      `${this._whitespaces}
        ${chalk.bold(elementName)} is already ${chalk.bold("deployed")}.`
    );
  }

  public async promptContinueDeployment(): Promise<void> {
    if (this._skipConfirmation) {
      return;
    }

    const con = await cli.prompt(
      "Do you wish to continue with deployment of this module? (Y/n)",
      {
        required: false,
      }
    );
    if (con === "n") {
      throw new DeniedConfirmation("Confirmation has been declined.");
    }
  }

  public async promptExecuteTx(): Promise<void> {
    if (this._skipConfirmation) {
      return;
    }

    const con = await cli.prompt("Execute transactions? (Y/n)", {
      required: false,
    });
    if (con === "n") {
      throw new DeniedConfirmation("Confirmation has been declined.");
    }
  }

  public promptSignedTransaction(tx: string): void {
    cli.debug(`${this._whitespaces} Signed transaction: ${tx}`);
  }

  public logError(error: Error): void {
    const { message } = generateErrorMessage(error);

    cli.info(message);
  }

  public sendingTx(): void {
    cli.action.start(`${this._whitespaces} Sending tx`);
  }

  public sentTx(): void {
    cli.action.stop("sent");
  }

  public bindingExecution(bindingName: string): void {
    cli.info(
      `${this._whitespaces}${chalk.bold(
        "Started"
      )} deploying binding - ${chalk.bold(bindingName)}`
    );
    this._whitespaces += "  ";
  }

  public finishedBindingExecution(bindingName: string): void {
    this._finishedElementExecution();
    cli.info(
      `${this._whitespaces}${chalk.bold(
        "Finished"
      )} binding execution - ${chalk.bold(bindingName)}\n`
    );
  }

  public eventExecution(eventName: string): void {
    cli.info(
      `${this._whitespaces}
        ${chalk.bold("Started")} executing event - ${chalk.bold(eventName)}`
    );
    this._whitespaces += "  ";
  }

  public finishedEventExecution(
    eventName: string,
    _eventType: EventType
  ): void {
    this._finishedElementExecution();
    cli.info(
      `${this._whitespaces}${chalk.bold(
        "Finished"
      )} event execution - ${chalk.bold(eventName)}\n`
    );
  }

  public executeContractFunction(functionName: string): void {
    cli.info(
      `${this._whitespaces}
      ${chalk.bold("Started")} execution of contract function - `,
      chalk.bold(functionName)
    );
    this._whitespaces += "  ";
  }

  public finishedExecutionOfContractFunction(functionName: string): void {
    this._finishedElementExecution();
    cli.info(
      `${this._whitespaces}${chalk.bold(
        "Finished"
      )} execution of contract function - ${chalk.bold(functionName)}`
    );
  }

  public executeWalletTransfer(from: string, to: string): void {
    cli.info(
      `${this._whitespaces}
      ${chalk.bold("Started")} execution of wallet transfer -  ${chalk.bold(
        from
      )} --> ${chalk.bold(to)}`
    );
    this._whitespaces += "  ";
  }

  public finishedExecutionOfWalletTransfer(from: string, to: string): void {
    this._finishedElementExecution();
    cli.info(
      `${this._whitespaces}
        ${chalk.bold("Finished")} execution of wallet transfer - ${chalk.bold(
        from
      )} --> ${chalk.bold(to)}`
    );
  }

  public transactionReceipt(): void {
    cli.info(`${this._whitespaces} Waiting for block confirmation...`);
  }

  public waitTransactionConfirmation(): void {
    cli.action.start(`${this._whitespaces} Block is mining`);
  }

  public transactionConfirmation(confirmationNumber: number): void {
    cli.action.stop(
      `\n${this._whitespaces} Current block confirmation: ${confirmationNumber}`
    );
  }

  public finishedModuleUsageGeneration(moduleName: string) {
    cli.info(`Finished module usage script file generation - ${moduleName}`);
  }

  public startingModuleUsageGeneration(moduleName: string) {
    cli.info(`Starting module usage script file generation - ${moduleName}`);
  }

  public async parallelizationExperimental() {
    cli.warn(
      chalk.yellow(
        "WARNING: This feature is experimental, please avoid using it while deploying to production"
      )
    );
    const yes = await cli.confirm(
      "Do you wish to continue with deployment of this module? (Y/n)"
    );
    if (!yes) {
      throw new DeniedConfirmation("Confirmation has been declined.");
    }
  }

  public async wrongNetwork(): Promise<boolean> {
    if (this._skipConfirmation) {
      return true;
    }

    return cli.confirm(
      "Contracts are missing on the network, do you wish to continue? (Y/n)"
    );
  }

  public gasPriceIsLarge(backoffTime: number) {
    cli.info(
      `${this._whitespaces}
        Gas price is too large, waiting for ${backoffTime}ms before continuing`
    );
  }

  public startModuleResolving(): void {}

  public finishModuleResolving(): void {}

  public contractFunctionAlreadyExecuted(
    _contractFunction: string,
    ..._args: any[]
  ): void {}

  private _finishedElementExecution(): void {
    this._whitespaces = this._whitespaces.slice(0, -2);
  }
}
