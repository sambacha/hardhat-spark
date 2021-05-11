import { generateErrorMessage, ILogging } from './index';
import { ModuleState } from '../../modules/states/module';
import { cli } from 'cli-ux';
import { EventType } from '../../../interfaces/hardhat_ignition';

export class JsonPrompter implements ILogging {
  private currentModuleName: string | undefined;

  constructor() {
  }

  alreadyDeployed(elementName: string): void {
    cli.info(JSON.stringify({
      name: 'Already deployed',
      fields: {
        elementName
      }
    }));
  }

  bindingExecution(bindingName: string): void {
    cli.info(JSON.stringify({
      name: 'Started deploying binding',
      fields: {
        bindingName
      }
    }));
  }

  logError(error: Error): void {
    const {
      message,
      stack
    } = generateErrorMessage(error);

    cli.error(JSON.stringify({
      name: 'Error',
      fields: {
        message,
        stack,
      }
    }));
  }

  eventExecution(eventName: string): void {
    cli.info(JSON.stringify({
      name: 'Started executing event',
      fields: {
        eventName
      }
    }));
  }

  executeContractFunction(contractFunction: string): void {
    cli.info(JSON.stringify({
      name: 'Started executing contract function',
      fields: {
        contractFunction
      }
    }));
  }

  executeWalletTransfer(from: string, to: string): void {
    cli.info(JSON.stringify({
      name: 'Executed wallet transaction',
      fields: {
        from,
        to,
      }
    }));
  }

  finishModuleDeploy(): void {
    cli.info(JSON.stringify({
      name: 'Finished module deployment',
      fields: {
        moduleName: this.currentModuleName
      }
    }));
  }

  finishedBindingExecution(bindingName: string): void {
    cli.info(JSON.stringify({
      name: 'Finished binding deployment',
      fields: {
        bindingName
      }
    }));
  }

  finishedEventExecution(eventName: string, eventType: EventType): void {
    cli.info(JSON.stringify({
      name: 'Finished event execution',
      fields: {
        eventName,
        eventType,
      }
    }));
  }

  finishedExecutionOfContractFunction(functionName: string): void {
    cli.info(JSON.stringify({
      name: 'Finished execution of contract function',
      fields: {
        functionName
      }
    }));
  }

  finishedExecutionOfWalletTransfer(from: string, to: string): void {
    cli.info(JSON.stringify({
      name: 'Finished execution of wallet transaction',
      fields: {
        from,
        to
      }
    }));
  }

  nothingToDeploy(): void {
    cli.info(JSON.stringify({
      name: 'Nothing to deploy',
      fields: {
        moduleName: this.currentModuleName
      }
    }));
  }

  promptContinueDeployment(): Promise<void> {
    return Promise.resolve();
  }

  promptExecuteTx(): Promise<void> {
    return Promise.resolve();
  }

  promptSignedTransaction(tx: string): void {
    cli.info(JSON.stringify({
      name: 'Singed tx',
      fields: {
        singedTx: tx
      }
    }));
  }

  sendingTx(elementName: string, functionName?: string): void {
    cli.info(JSON.stringify({
      name: 'Sending transaction for contract',
      fields: {
        elementName: elementName,
        functionName: functionName
      }
    }));
  }

  sentTx(elementName: string, functionName: string = 'CREATE'): void {
    cli.info(JSON.stringify({
      name: 'Sent transaction for contract',
      fields: {
        elementName: elementName,
        functionName: functionName
      }
    }));
  }

  startModuleDeploy(moduleName: string, moduleStates: ModuleState): void {
    cli.info(JSON.stringify({
      name: 'Started module deployment',
      fields: {
        moduleName,
      }
    }));
    this.currentModuleName = moduleName;
  }

  transactionConfirmation(confirmationNumber: number, elementName: string, functionName: string = 'CREATE'): void {
    cli.info(JSON.stringify({
      name: 'Transaction confirmation',
      fields: {
        confirmationNumber,
        elementName,
        functionName,
      }
    }));
  }

  transactionReceipt(): void {
  }

  waitTransactionConfirmation(): void {
  }

  generatedTypes(): void {
    cli.info(JSON.stringify({
      name: 'Successfully generated module types'
    }));
  }

  finishedModuleUsageGeneration(moduleName: string) {
  }

  startingModuleUsageGeneration(moduleName: string) {
  }

  async parallelizationExperimental() {
  }

  wrongNetwork(): Promise<boolean> {
    return Promise.resolve(true);
  }

  gasPriceIsLarge(backoffTime: number) {
    cli.info(JSON.stringify({
      name: 'Gas price is too large, waiting to gets lower.',
      fields: backoffTime
    }));
  }

  finishModuleResolving(): void {
  }

  startModuleResolving(): void {
  }

  contractFunctionAlreadyExecuted(contractFunction: string, ...args: any[]): void {
  }
}
