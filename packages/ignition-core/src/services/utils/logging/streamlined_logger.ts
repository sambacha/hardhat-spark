import chalk from "chalk";
import cli from "cli-ux";

import { EventType } from "../../../interfaces/hardhat_ignition";
import { ModuleState } from "../../modules/states/module";
import { DeniedConfirmation } from "../../types/errors";

import { generateErrorMessage, ILogging } from "./index";

export class StreamlinedLogger implements ILogging {
  private whitespaces: string;
  private readonly skipConfirmation: boolean;

  constructor(skipConfirmation: boolean = false) {
    this.skipConfirmation = skipConfirmation;
    this.whitespaces = "";
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
    moduleStates: ModuleState
  ): void {
    cli.info(chalk.bold("\nDeploy module - ", chalk.green(moduleName)));
    this.whitespaces += "  ";
  }

  public finishModuleDeploy(moduleName: string, summary: string): void {
    this.finishedElementExecution();
    cli.info(summary);
  }

  public alreadyDeployed(elementName: string): void {
    cli.info(
      this.whitespaces +
        `${chalk.bold(elementName)} is already ${chalk.bold("deployed")}.`
    );
  }

  public async promptContinueDeployment(): Promise<void> {
    if (this.skipConfirmation) {
      return;
    }

    const con = await cli.prompt(
      "Do you wish to continue with deployment of this module? (Y/n)",
      {
        required: false,
      }
    );
    if (con == "n") {
      throw new DeniedConfirmation("Confirmation has been declined.");
    }
  }

  public async promptExecuteTx(): Promise<void> {
    if (this.skipConfirmation) {
      return;
    }

    const con = await cli.prompt("Execute transactions? (Y/n)", {
      required: false,
    });
    if (con == "n") {
      throw new DeniedConfirmation("Confirmation has been declined.");
    }
  }

  public promptSignedTransaction(tx: string): void {
    cli.debug(this.whitespaces + `Signed transaction: ${tx}`);
  }

  public logError(error: Error): void {
    const { message, stack } = generateErrorMessage(error);

    cli.info(message);
  }

  public sendingTx(): void {
    cli.action.start(this.whitespaces + "Sending tx");
  }

  public sentTx(): void {
    cli.action.stop("sent");
  }

  public bindingExecution(bindingName: string): void {
    cli.info(
      `${this.whitespaces}${chalk.bold(
        "Started"
      )} deploying binding - ${chalk.bold(bindingName)}`
    );
    this.whitespaces += "  ";
  }

  public finishedBindingExecution(bindingName: string): void {
    this.finishedElementExecution();
    cli.info(
      `${this.whitespaces}${chalk.bold(
        "Finished"
      )} binding execution - ${chalk.bold(bindingName)}\n`
    );
  }

  public eventExecution(eventName: string): void {
    cli.info(
      this.whitespaces +
        `${chalk.bold("Started")} executing event - ${chalk.bold(eventName)}`
    );
    this.whitespaces += "  ";
  }

  public finishedEventExecution(eventName: string, eventType: EventType): void {
    this.finishedElementExecution();
    cli.info(
      `${this.whitespaces}${chalk.bold(
        "Finished"
      )} event execution - ${chalk.bold(eventName)}\n`
    );
  }

  public executeContractFunction(functionName: string): void {
    cli.info(
      this.whitespaces +
        `${chalk.bold("Started")} execution of contract function - `,
      chalk.bold(functionName)
    );
    this.whitespaces += "  ";
  }

  public finishedExecutionOfContractFunction(functionName: string): void {
    this.finishedElementExecution();
    cli.info(
      `${this.whitespaces}${chalk.bold(
        "Finished"
      )} execution of contract function - ${chalk.bold(functionName)}`
    );
  }

  public executeWalletTransfer(from: string, to: string): void {
    cli.info(
      this.whitespaces +
        `${chalk.bold("Started")} execution of wallet transfer -  ${chalk.bold(
          from
        )} --> ${chalk.bold(to)}`
    );
    this.whitespaces += "  ";
  }

  public finishedExecutionOfWalletTransfer(from: string, to: string): void {
    this.finishedElementExecution();
    cli.info(
      this.whitespaces +
        `${chalk.bold("Finished")} execution of wallet transfer - ${chalk.bold(
          from
        )} --> ${chalk.bold(to)}`
    );
  }

  public transactionReceipt(): void {
    cli.info(this.whitespaces + "Waiting for block confirmation...");
  }

  public waitTransactionConfirmation(): void {
    cli.action.start(this.whitespaces + "Block is mining");
  }

  public transactionConfirmation(confirmationNumber: number): void {
    cli.action.stop(
      `\n${this.whitespaces} Current block confirmation: ${confirmationNumber}`
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
    if (this.skipConfirmation) {
      return true;
    }

    return cli.confirm(
      "Contracts are missing on the network, do you wish to continue? (Y/n)"
    );
  }

  public gasPriceIsLarge(backoffTime: number) {
    cli.info(
      this.whitespaces +
        `Gas price is too large, waiting for ${backoffTime}ms before continuing`
    );
  }

  public startModuleResolving(): void {}

  public finishModuleResolving(): void {}

  public contractFunctionAlreadyExecuted(
    contractFunction: string,
    ...args: any[]
  ): void {}

  private finishedElementExecution(): void {
    this.whitespaces = this.whitespaces.slice(0, -2);
  }
}
