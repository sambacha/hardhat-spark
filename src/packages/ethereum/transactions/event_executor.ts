import { ContractFunction } from '@ethersproject/contracts/src.ts/index';
import { checkIfExist } from '../../utils/util';
import { CliError } from '../../types/errors';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Namespace } from 'cls-hooked';
import { KeyMutex } from '../../utils/mutex/key_mutex';

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

  private mutex: KeyMutex;

  constructor(eventSession: Namespace) {
    this.rootEvents = {};
    this.eventSession = eventSession;
    this.currentNumber = 0;

    this.mutex = new KeyMutex();
  }

  add(eventName: string, walletAddress: string, fn: ((...args: Array<any>) => Promise<TransactionResponse>)) {
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

  async executeAll(): Promise<void> {
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

    // think how to execute this in batched way, currently is single execution

    const allSenders = [];
    for (const [sender, array] of Object.entries(executionOrdering)) {
      allSenders.push(this.executeSenderContractFunctions(sender, array));
    }
    await Promise.all(allSenders);

    this.currentNumber = 0;
  }

  private async executeSenderContractFunctions(sender: string, array: Array<any>): Promise<void> {
    for (const singleElement of array) {
      const args = singleElement.event.args;
      const func = singleElement.event.func;

      const resolve = await this.mutex.acquireQueued(sender);
      const tx = await func(...args);
      resolve();

      await singleElement.event.resolveFunc(tx);

      delete this.rootEvents[singleElement.eventName];
    }
  }
}
