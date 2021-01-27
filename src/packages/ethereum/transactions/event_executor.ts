import { ContractFunction } from '@ethersproject/contracts/src.ts/index';
import { checkIfExist } from '../../utils/util';
import { CliError } from '../../types/errors';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';

export class EventTxExecutor {
  private rootEvents: { [eventName: string]: ContractFunction };

  constructor() {
    this.rootEvents = {};
  }

  add(eventName: string, fn: ((...args: Array<any>) => Promise<TransactionResponse>)) {
    if (checkIfExist(this.rootEvents[eventName])) {
      throw new CliError(`Execution is still blocked, something went wrong - ${eventName}`);
    }

    this.rootEvents[eventName] = fn;
  }

  async executeSingle(eventName: string, ...args: Array<any>): Promise<TransactionReceipt> {
    const func = this.rootEvents[eventName];
    this.rootEvents[eventName] = undefined;

    return func(...args);
  }

  async executeAll() {
    for (const [eventName, contractFunction] of Object.entries(this.rootEvents)) {
      await this.executeSingle(eventName);

      this.rootEvents[eventName] = undefined;
    }
  }
}
