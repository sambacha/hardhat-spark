import { IPrompter } from './index';
import { ModuleState } from '../../modules/states/module';
import cli from 'cli-ux';
import chalk from 'chalk';
import Listr from 'listr';
import { Observable } from 'rxjs';
import { UpdateRenderer } from './render/custom_renderer';

enum StateElementStatus {
  'NOT_EXECUTED' = 'not executed',
  'STARTED' = 'started',
  'SUCCESSFUL' = 'successful',
  'DEPLOYED' = 'already executed/deployed',
  'FAILED' = 'failed',
}

export class OverviewPrompter2 implements IPrompter {
  private currentElementsBar: {
    [moduleName: string]: {
      [eventName: string]: any
    }
  };

  private currentModuleName: string = '';

  constructor() {
    this.currentElementsBar = {};
  }

  startModuleDeploy(moduleName: string, moduleState: ModuleState): void {
    this.currentModuleName = moduleName;
    this.currentElementsBar[moduleName] = {};
    cli.info(chalk.bold('\n\nDeploy module - ', chalk.green(moduleName)));

    let maxLength = 0;
    for (const [elementName, ] of Object.entries(moduleState)) {
      if (elementName.length >= maxLength) {
        maxLength = elementName.length;
      }
    }

    const tasks = new Listr([], {
      concurrent: true,
      exitOnError: true,
      renderer: UpdateRenderer,
    });

    for (const [elementName, ] of Object.entries(moduleState)) {
      tasks.add({
        title: elementName,
        task: () => {
          return new Observable(observer => {
            this.currentElementsBar[moduleName][elementName] = observer;
          });
        }
      });
    }

    tasks.run().catch(err => {
      throw new err;
    });
  }

  alreadyDeployed(elementName: string): void {
    this.currentElementsBar[this.currentModuleName][elementName].next(StateElementStatus.DEPLOYED);
    this.currentElementsBar[this.currentModuleName][elementName].complete();

    delete this.currentElementsBar[this.currentModuleName][elementName];
  }

  bindingExecution(bindingName: string): void {
    this.currentElementsBar[this.currentModuleName][bindingName].next(StateElementStatus.STARTED);
    this.currentElementsBar[this.currentModuleName][bindingName].complete();

    delete this.currentElementsBar[this.currentModuleName][bindingName];
  }

  errorPrompt(): void {
    if (
      !this.currentModuleName ||
      !this.currentElementsBar ||
      this.currentElementsBar[this.currentModuleName]
    ) {
      return;
    }

    for (const [elementName, ] of Object.entries(this.currentElementsBar[this.currentModuleName])) {
      this.currentElementsBar[this.currentModuleName][elementName].next(StateElementStatus.FAILED);
      this.currentElementsBar[this.currentModuleName][elementName].complete();

      delete this.currentElementsBar[this.currentModuleName][elementName];
    }
  }

  eventExecution(eventName: string): void {
    this.currentElementsBar[this.currentModuleName][eventName].next(StateElementStatus.STARTED);
  }

  finishModuleDeploy(): void {

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

    this.currentElementsBar[this.currentModuleName][elementName].next(StateElementStatus.SUCCESSFUL);

    this.currentElementsBar[this.currentModuleName][elementName].complete();
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

  generatedTypes(): void {
    cli.info("Successfully generated module types, look under './.mortar/<module_name>'");
  }

  finishedModuleUsageGeneration(moduleName: string) {
  }

  startingModuleUsageGeneration(moduleName: string) {
  }
}
