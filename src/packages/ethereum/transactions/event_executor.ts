import { ContractFunction } from '@ethersproject/contracts/src.ts/index';
import { checkIfExist } from '../../utils/util';
import { CliError } from '../../types/errors';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Namespace } from 'cls-hooked';

export class EventTxExecutor {
  private eventSession: Namespace;
  private rootEvents: {
    [eventName: string]: {
      sender: string,
      func: ContractFunction
      resolveFunc: Function | undefined,
      args: Array<any> | undefined,
    }
  };
  private currentNumber: number;

  constructor(eventSession: Namespace) {
    this.rootEvents = {};
    this.eventSession = eventSession;
    this.currentNumber = 0;
  }

  add(eventName: string, walletAddress: string, nonce: number, fn: ((...args: Array<any>) => Promise<TransactionResponse>)) {
    if (checkIfExist(this.rootEvents[eventName])) {
      throw new CliError(`Execution is still blocked, something went wrong - ${eventName}`);
    }

    this.rootEvents[eventName] = {
      func: fn,
      sender: walletAddress,
      args: undefined, resolveFunc: undefined,
    };
    this.currentNumber++;
  }

  async executeSingle(eventName: string, ...args: Array<any>): Promise<TransactionResponse> {
    this.rootEvents[eventName].args = args;

    return new Promise(async (resolve, reject) => {
      try {
        this.rootEvents[eventName].resolveFunc = resolve;
        await this.executeAll();
      } catch (e) {
        reject(e);
      }
    });
  }

  async executeAll() {
    const executionOrdering: { [address: string]: any } = {};

    for (const [eventName, rootEvent] of Object.entries(this.rootEvents)) {
      if (!executionOrdering[rootEvent.sender]) {
        executionOrdering[rootEvent.sender] = [];
      }

      executionOrdering[rootEvent.sender].push({
        eventName,
        event: rootEvent
      });
    }

    if (Object.keys(this.rootEvents).length != this.currentNumber) {
      return;
    }

    for (const [sender, array] of Object.entries(executionOrdering)) {
      for (const singleElement of array) {
        const args = singleElement.event.args;
        const func = singleElement.event.func;
        const tx = await func(...args);

        await singleElement.event.resolveFunc(tx);

        delete this.rootEvents[singleElement.eventName];
      }
    }

    this.currentNumber = 0;
  }
}
