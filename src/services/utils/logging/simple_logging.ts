import { generateErrorMessage, ILogging } from './index';
import { ModuleState } from '../../modules/states/module';
import { SingleBar } from 'cli-progress';
import cli from 'cli-ux';
import chalk from 'chalk';
import { checkIfExist } from '../util';
import { CliError, DeniedConfirmation, ModuleContextMissingInLogger } from '../../types/errors';
import { FileLogging } from './file_logging';
import { EventType } from '../../../interfaces/hardhat_ignition';

export enum StateElementStatus {
  'NOT_EXECUTED' = 'not executed',
  'RUNNING' = 'running',
  'SUCCESSFUL' = 'successful',
  'DEPLOYED' = 'already executed/deployed',
  'FAILED' = 'failed',
}

enum DescActionList {
  'SKIPPED' = 'skipped',
  'SUCCESSFUL' = 'SUCCESSFUL',
  'CREATE' = 'create',
  'LOWER_GAS_PRICE' = 'waiting for lower gas price'
}

export class SimpleOverviewPrompter extends FileLogging implements ILogging {
  private moduleBars: {
    [moduleName: string]: SingleBar
  };

  private currentModuleName: string | undefined;

  constructor() {
    super();
    this.moduleBars = {};
  }

  gasPriceIsLarge(backoffTime: number) {
    super.gasPriceIsLarge(backoffTime);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].update({
      action: DescActionList.LOWER_GAS_PRICE,
    });
  }

  async parallelizationExperimental() {
    cli.info(chalk.yellow('WARNING: This feature is experimental, please avoid using it while deploying to production'));
    cli.confirm('Confirm you are willing to continue');
    const yes = await cli.confirm('Do you wish to continue with deployment of this module? (Y/n)');
    if (!yes) {
      throw new DeniedConfirmation('Confirmation has been declined.');
    }
  }


  finishedExecutionOfWalletTransfer(from: string, to: string): void {
    super.finishedExecutionOfWalletTransfer(from, to);
  }

  executeWalletTransfer(address: string, to: string): void {
    super.finishedExecutionOfWalletTransfer(address, to);
  }

  startModuleDeploy(moduleName: string, moduleState: ModuleState): void {
    super.startModuleDeploy(moduleName, moduleState);

    this.currentModuleName = moduleName;
    cli.info(chalk.bold('\n\nDeploy module - ', chalk.green(moduleName)));

    this.moduleBars[moduleName] = new SingleBar({
      clearOnComplete: false,
      synchronousUpdate: true,
      fps: 100,
      format: `# ${chalk.bold('{module}')} | {percentage}% | {value}/{total} | Current element: ${chalk.bold('{element}')} -> status: {status} | Action: {action}`,
    });
    this.moduleBars[moduleName].start(Object.entries(moduleState).length, 0, {
      module: this.currentModuleName,
      element: 'N/A',
      status: 'N/A'
    });
  }

  alreadyDeployed(elementName: string): void {
    super.alreadyDeployed(elementName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }

    this.moduleBars[this.currentModuleName].increment({
      module: this.currentModuleName,
      element: elementName,
      status: StateElementStatus.DEPLOYED,
      action: DescActionList.SKIPPED
    });
  }

  bindingExecution(bindingName: string): void {
    super.bindingExecution(bindingName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: bindingName,
      status: StateElementStatus.RUNNING,
      action: DescActionList.CREATE
    });
  }

  logError(error: Error): void {
    super.logError(error);
    if (!this?.currentModuleName) {
      return;
    }
    if (!this.moduleBars[this.currentModuleName]) {
      return;
    }

    this.moduleBars[this.currentModuleName].stop();
    const {
      message,
      stack
    } = generateErrorMessage(error);

    cli.info(message);
  }

  eventExecution(eventName: string): void {
    super.eventExecution(eventName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: eventName,
      status: StateElementStatus.RUNNING,
      action: 'N/A'
    });
  }

  finishModuleDeploy(moduleName: string, summary: string): void {
    super.finishModuleDeploy(moduleName, summary);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: this.currentModuleName,
      status: StateElementStatus.SUCCESSFUL,
      action: 'N/A'
    });
    this.moduleBars[this.currentModuleName].stop();

    this.currentModuleName = '';

    cli.info(summary);
  }

  finishedEventExecution(eventName: string, eventType: EventType): void {
    super.finishedEventExecution(eventName, eventType);

    this.handleElementCompletion(eventName);
  }

  finishedBindingExecution(bindingName: string): void {
    super.finishedBindingExecution(bindingName);

    this.handleElementCompletion(bindingName);
  }

  private handleElementCompletion(elementName: string): void {
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.moduleBars[this.currentModuleName].increment({
      module: this.currentModuleName,
      element: elementName,
      status: StateElementStatus.SUCCESSFUL,
      action: 'N/A'
    });
  }

  finishedExecutionOfContractFunction(functionName: string): void {
    super.finishedExecutionOfContractFunction(functionName);
  }

  nothingToDeploy(): void {
    super.nothingToDeploy();
    cli.info('State file is up to date and their is nothing to be deployed, if you still want to trigger deploy use --help to see how.');
    cli.exit(0);
  }

  promptContinueDeployment(): Promise<void> {
    // overview will not have confirmations
    return Promise.resolve();
  }

  promptExecuteTx(): Promise<void> {
    // overview will not have metadata
    return Promise.resolve();
  }

  promptSignedTransaction(tx: string): void {
    super.promptSignedTransaction(tx);
    // overview will not have metadata
    return;
  }

  sendingTx(eventName: string, functionName: string = 'CREATE'): void {
    super.sendingTx(eventName, functionName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    if (!checkIfExist(this.moduleBars[this.currentModuleName])) {
      throw new CliError('Current module not found when trying to log transactions');
    }

    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: eventName,
      status: StateElementStatus.RUNNING,
      action: `${functionName} -> sending`
    });
  }

  sentTx(eventName: string, functionName: string = 'CREATE'): void {
    super.sentTx(eventName, functionName);
    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }

    if (!checkIfExist(this.moduleBars[this.currentModuleName])) {
      throw new CliError('Current module not found when trying to log transactions');
    }

    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: eventName,
      status: StateElementStatus.RUNNING,
      action: `${functionName} -> sent`
    });
  }

  transactionConfirmation(confirmationNumber: number, eventName: string, functionName: string = 'CREATE'): void {
    super.transactionConfirmation(confirmationNumber, eventName, functionName);

    if (!this?.currentModuleName) {
      throw new ModuleContextMissingInLogger();
    }
    if (!checkIfExist(this.moduleBars[this.currentModuleName])) {
      throw new CliError('Current module not found when trying to log transactions');
    }

    this.moduleBars[this.currentModuleName].update({
      module: this.currentModuleName,
      element: eventName,
      status: StateElementStatus.RUNNING,
      action: `${functionName} -> confirmed ${confirmationNumber}`
    });
  }

  transactionReceipt(): void {
    super.transactionReceipt();

  }

  waitTransactionConfirmation(): void {
    super.waitTransactionConfirmation();
  }

  executeContractFunction(contractFunction: string): void {
    super.executeContractFunction(contractFunction);
  }

  generatedTypes(): void {
    super.generatedTypes();
    cli.info('Successfully generated module types, look under your deployments folder for .d.ts file.');
  }

  finishedModuleUsageGeneration(moduleName: string) {
    super.finishedModuleUsageGeneration(moduleName);
  }

  startingModuleUsageGeneration(moduleName: string) {
    super.startingModuleUsageGeneration(moduleName);
  }

  async wrongNetwork(): Promise<boolean> {
    super.wrongNetwork();
    return await cli.confirm('Contracts are missing on the network, do you wish to continue? (Y/n)');
  }

  startModuleResolving(): void {
  }

  finishModuleResolving(): void {
  }
}
