import { IPrompter } from './index';
import { ModuleState } from '../../modules/states/module';
import { MultiBar, SingleBar } from 'cli-progress';
import cli from 'cli-ux';
import chalk from 'chalk';
import { CliError } from '../../types/errors';
import { checkIfExist } from '../util';

enum StateElementStatus {
  'NOT_EXECUTED' = 'not executed',
  'STARTED' = 'started',
  'SUCCESSFUL' = 'successful',
  'DEPLOYED' = 'already executed/deployed',
  'FAILED' = 'failed',
}

export class OverviewPrompter implements IPrompter {
  private multiBar: {
    [moduleName: string]: MultiBar
  };
  private currentElementsBar: {
    [moduleName: string]: {
      [eventName: string]: SingleBar
    }
  };

  private currentModuleName: string = '';

  constructor() {
    this.multiBar = {};
    this.currentElementsBar = {};
  }

  startModuleDeploy(moduleName: string, moduleState: ModuleState): void {
    this.currentModuleName = moduleName;
    this.currentElementsBar[moduleName] = {};
    cli.info(chalk.bold('\n\nDeploy module - ', chalk.green(moduleName)));

    let maxLength = 0;
    for (const [elementName,] of Object.entries(moduleState)) {
      if (elementName.length >= maxLength) {
        maxLength = elementName.length;
      }
    }

    this.multiBar[moduleName] = new MultiBar({
      clearOnComplete: false,
      stopOnComplete: true,
      fps: 100,
      format: (options, params, payload: { status: StateElementStatus, name: string }) => {
        const whitespaces = ' '.repeat(maxLength - payload.name.length);
        switch (payload.status) {
          case StateElementStatus.STARTED:
          case StateElementStatus.NOT_EXECUTED:
            return `# ${chalk.bold(payload.name)} ${whitespaces}-> Current status: ${chalk.yellow(payload.status)}`;
          case StateElementStatus.FAILED:
            return `# ${chalk.bold(payload.name)} ${whitespaces}-> Current status: ${chalk.red(payload.status)}`;
          case StateElementStatus.SUCCESSFUL:
          case StateElementStatus.DEPLOYED:
            return `# ${chalk.bold(payload.name)} ${whitespaces}-> Current status: ${chalk.green(payload.status)}`;
          default:
            throw new CliError(`Not valid status - ${payload.status}`);
        }
      }
    });

    for (const [elementName,] of Object.entries(moduleState)) {
      this.currentElementsBar[moduleName][elementName] = this.multiBar[moduleName].create(0, 0, {
        name: elementName,
        status: StateElementStatus.NOT_EXECUTED,
      });
    }
  }

  alreadyDeployed(elementName: string): void {
    this.currentElementsBar[this.currentModuleName][elementName].update({
      status: StateElementStatus.DEPLOYED,
      name: elementName,
    });
    this.currentElementsBar[this.currentModuleName][elementName].stop();

    delete this.currentElementsBar[this.currentModuleName][elementName];
  }

  bindingExecution(bindingName: string): void {
    this.currentElementsBar[this.currentModuleName][bindingName].start(1, 0, {
      status: StateElementStatus.STARTED,
      name: bindingName,
    });
  }

  errorPrompt(): void {
    if (!checkIfExist(this.currentElementsBar[this.currentModuleName])) {
      return;
    }

    for (const [elementName,] of Object.entries(this.currentElementsBar[this.currentModuleName])) {
      this.currentElementsBar[this.currentModuleName][elementName].update({
        status: StateElementStatus.FAILED,
        name: elementName,
      });

      this.currentElementsBar[this.currentModuleName][elementName].stop();
      delete this.currentElementsBar[this.currentModuleName][elementName];
    }
  }

  eventExecution(eventName: string): void {
    this.currentElementsBar[this.currentModuleName][eventName].start(1, 0, {
      status: StateElementStatus.STARTED,
      name: eventName,
    });
  }

  finishModuleDeploy(): void {
    this.multiBar[this.currentModuleName].stop();

    cli.info(`${chalk.green('Successfully')} deployed module - ${chalk.green(this.currentModuleName)}`);
    this.currentModuleName = '';
  }

  finishedEventExecution(eventName: string): void {
    this.handleElementCompletion(eventName);
  }

  finishedBindingExecution(bindingName: string): void {
    this.handleElementCompletion(bindingName);
  }

  private handleElementCompletion(elementName: string): void {
    if (!this.currentElementsBar[this.currentModuleName][elementName]) {
      return;
    }

    this.currentElementsBar[this.currentModuleName][elementName].update({
      status: StateElementStatus.SUCCESSFUL,
      name: elementName,
    });

    this.currentElementsBar[this.currentModuleName][elementName].stop();
    delete this.currentElementsBar[this.currentModuleName][elementName];
  }

  finishedExecutionOfContractFunction(functionName: string): void {
  }

  nothingToDeploy(): void {
    cli.info('State file is up to date and their is nothing to be deployed, if you still want to trigger deploy use --help to see how.');
    cli.exit(0);
  }

  promptContinueDeployment(): Promise<void> {
    // overview will not have confirmations
    return;
  }

  promptExecuteTx(): Promise<void> {
    // overview will not have metadata
    return;
  }

  promptSignedTransaction(tx: string): void {
    // overview will not have metadata
    return;
  }

  sendingTx(): void {
  }

  sentTx(): void {
  }

  transactionConfirmation(confirmationNumber: number): void {
  }

  transactionReceipt(): void {
  }

  waitTransactionConfirmation(): void {
  }

  executeContractFunction(): void {
  }

  executeWalletTransfer(address: string, to: string): void {
  }

  finishedExecutionOfWalletTransfer(from: string, to: string): void {
  }
}
