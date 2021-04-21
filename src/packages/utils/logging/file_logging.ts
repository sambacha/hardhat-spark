import { ILogging } from './index';
import { ModuleState } from '../../modules/states/module';
import * as path from 'path';
import * as fs from 'fs';
import { DEPLOYMENT_FOLDER } from '../../tutorial/tutorial_service';

const FOLDER_NAME = '.log';


export class FileLogging implements ILogging {
  private fullLogPath: string;
  private moduleName: string;

  constructor() {
  }

  alreadyDeployed(elementName: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'Element has already been deployed',
      fields: {
        moduleName: this.moduleName,
        elementName
      }
    }) + '\n');
  }

  bindingExecution(bindingName: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'Started contract binding execution',
      fields: {
        moduleName: this.moduleName,
        bindingName
      }
    }) + '\n');
  }

  errorPrompt(error: Error): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'Error',
      fields: {
        errorMessage: error.message,
        errorName: error.name,
        error
      }
    }) + '\n');
  }

  eventExecution(eventName: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'Started event execution',
      fields: {
        moduleName: this.moduleName,
        eventName
      }
    }) + '\n');
  }

  executeContractFunction(contractFunction: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'Executing contract function',
      fields: {
        moduleName: this.moduleName,
        contractFunction
      }
    }) + '\n');
  }

  executeWalletTransfer(address: string, to: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'Executing wallet transfer',
      fields: {
        moduleName: this.moduleName,
        address,
        to,
      }
    }) + '\n');
  }

  finishModuleDeploy(moduleName: string, summary: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'finished module deployment',
      fields: {
        moduleName,
      }
    }) + '\n');
  }

  finishedBindingExecution(bindingName: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'finished contract binding deployment',
      fields: {
        moduleName: this.moduleName,
        bindingName,
      }
    }) + '\n');
  }

  finishedEventExecution(eventName: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'finished event hook execution',
      fields: {
        moduleName: this.moduleName,
        eventName,
      }
    }) + '\n');
  }

  finishedExecutionOfContractFunction(functionName: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'finished execution of contract function',
      fields: {
        moduleName: this.moduleName,
        functionName,
      }
    }) + '\n');
  }

  finishedExecutionOfWalletTransfer(from: string, to: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'finished execution of wallet transfer',
      fields: {
        moduleName: this.moduleName,
        from,
        to,
      }
    }) + '\n');
  }

  finishedModuleUsageGeneration(moduleName: string) {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'finished module usage generation',
      fields: {
        moduleName,
      }
    }) + '\n');
  }

  gasPriceIsLarge(backoffTime: number) {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'gas price is to large',
      fields: {
        moduleName: this.moduleName,
        backoffTime,
      }
    }) + '\n');
  }

  generatedTypes(): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'generated types',
      fields: {},
    }) + '\n');
  }

  nothingToDeploy(): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'nothing to deploy',
      fields: {
        moduleName: this.moduleName,
      },
    }) + '\n');
  }

  parallelizationExperimental() {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'running parallelization',
      fields: {},
    }) + '\n');
  }

  promptContinueDeployment(): Promise<void> {
    return Promise.resolve(undefined);
  }

  promptExecuteTx(): Promise<void> {
    return Promise.resolve(undefined);
  }

  promptSignedTransaction(tx: string): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'singed tx',
      fields: {
        moduleName: this.moduleName,
        signedTransaction: tx,
      },
    }) + '\n');
  }

  sendingTx(elementName: string, functionName: string = 'CREATE'): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'sending transaction',
      fields: {
        elementName,
        functionName: functionName,
      },
    }) + '\n');
  }

  sentTx(elementName: string, functionName: string = 'CREATE'): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'sent transaction',
      fields: {
        elementName,
        functionName: functionName,
      },
    }) + '\n');
  }

  startModuleDeploy(moduleName: string, moduleStates: ModuleState): void {
    const timestamp = Math.trunc((new Date()).getTime() / 1000);

    const currentDir = process.cwd();
    this.fullLogPath = path.join(currentDir, DEPLOYMENT_FOLDER, FOLDER_NAME, `/ignition.${moduleName.toLowerCase()}.${timestamp}.log`);

    this.moduleName = moduleName;

    const dirPath = path.resolve(currentDir, DEPLOYMENT_FOLDER, FOLDER_NAME);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    fs.writeFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'started module deployment',
      fields: {
        moduleName,
      },
    }) + '\n');
  }

  startingModuleUsageGeneration(moduleName: string) {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'started module usage generation',
      fields: {
        moduleName,
      },
    }) + '\n');
  }

  transactionConfirmation(confirmationNumber: number, elementName: string, functionName: string = 'CREATE'): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'started module usage generation',
      fields: {
        confirmationNumber,
        elementName,
        functionName,
      },
    }) + '\n');
  }

  transactionReceipt(): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'received transaction receipt',
      fields: {},
    }) + '\n');
  }

  waitTransactionConfirmation(): void {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'wait for transaction confirmation',
      fields: {},
    }) + '\n');
  }

  wrongNetwork() {
    fs.appendFileSync(this.fullLogPath, JSON.stringify({
      timestamp: new Date().getTime(),
      message: 'wrong network',
      fields: {},
    }) + '\n');
  }
}
