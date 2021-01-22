import cli from 'cli-ux';
import { DeniedConfirmation } from './types/errors';
import chalk from 'chalk';

export class Prompter {
  private whitespaces: string;
  private readonly skipConfirmation: boolean;

  constructor(skipConfirmation: boolean = false) {
    this.skipConfirmation = skipConfirmation;
    this.whitespaces = '';
  }

  startModuleDeploy(moduleName: string): void {
    cli.info(chalk.bold('\nDeploy module - ', chalk.green(moduleName)));
    this.whitespaces += '  ';
  }

  finishModuleDeploy(): void {
    this.finishedElementExecution();
  }

  async alreadyDeployed(elementName: string) {
    cli.info(`${chalk.bold(elementName)} is already ${chalk.bold('deployed')}.`);
  }

  async promptContinueDeployment(): Promise<void> {
    if (this.skipConfirmation) {
      return;
    }

    const con = await cli.prompt('Do you wish to continue with deployment of this module? (Y/n)', {
      required: false
    });
    if (con == 'n') {
      throw new DeniedConfirmation('Confirmation has been declined.');
    }
  }

  async promptExecuteTx(): Promise<void> {
    if (this.skipConfirmation) {
      return;
    }

    const con = await cli.prompt('Execute transactions? (Y/n)', {
      required: false
    });
    if (con == 'n') {
      throw new DeniedConfirmation('Confirmation has been declined.');
    }
  }

  promptSignedTransaction(tx: string): void {
    cli.debug(this.whitespaces + `Signed transaction: ${tx}`);
  }

  errorPrompt(error: Error): void {
    cli.error(error);
  }

  sendingTx(): void {
    cli.action.start(this.whitespaces + 'Sending tx');
  }

  sentTx(): void {
    cli.action.stop('sent');
  }

  bindingExecution(bindingName: string): void {
    cli.info(`${this.whitespaces}${chalk.bold('Started')} deploying binding - ${chalk.bold(bindingName)}`);
    this.whitespaces += '  ';
  }

  finishedBindingExecution(bindingName: string): void {
    this.finishedElementExecution();
    cli.info(`${this.whitespaces}${chalk.bold('Finished')} binding execution - ${chalk.bold(bindingName)}\n`);
  }

  finishedElementExecution(): void {
    this.whitespaces = this.whitespaces.slice(0, -2);
  }

  eventExecution(eventName: string): void {
    cli.info(this.whitespaces + `${chalk.bold('Started')} executing event - ${chalk.bold(eventName)}`);
    this.whitespaces += '  ';
  }

  finishedEventExecution(eventName: string): void {
    this.finishedElementExecution();
    cli.info(`${this.whitespaces}${chalk.bold('Finished')} event execution - ${chalk.bold(eventName)}\n`);
  }

  executeContractFunction(functionName: string): void {
    cli.info(this.whitespaces + `${chalk.bold('Started')} execution of contract function - `, chalk.bold(functionName));
    this.whitespaces += '  ';
  }

  finishedExecutionOfContractFunction(functionName: string): void {
    this.finishedElementExecution();
    cli.info(`${this.whitespaces}${chalk.bold('Finished')} execution of contract function - ${chalk.bold(functionName)}\n`);
  }

  transactionReceipt(): void {
    cli.info(this.whitespaces + 'Waiting for block confirmation...');
  }

  waitTransactionConfirmation(): void {
    cli.action.start(this.whitespaces + 'Block is mining');
  }

  transactionConfirmation(confirmationNumber: number): void {
    cli.action.stop(`\n${this.whitespaces} Current block confirmation: ${confirmationNumber}`);
  }
}
