import { IPrompter } from './index';
import { ModuleState } from '../../modules/states/module';
import { cli } from 'cli-ux';

export class JsonPrompter implements IPrompter {
  private currentModuleName: string;

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

  errorPrompt(): void {
    cli.error(JSON.stringify({
      name: 'Error',
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

  finishedEventExecution(eventName: string): void {
    cli.info(JSON.stringify({
      name: 'Finished event execution',
      fields: {
        eventName
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
    return;
  }

  promptExecuteTx(): Promise<void> {
    return;
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

  sentTx(elementName: string, functionName?: string): void {
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

  transactionConfirmation(confirmationNumber: number, elementName: string, functionName?: string): void {
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
}
