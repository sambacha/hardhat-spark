import { TransactionResponse } from "@ethersproject/abstract-provider";
import { ContractFunction } from "@ethersproject/contracts";
import { Namespace } from "cls-hooked";

import { IModuleStateRepo } from "../../modules/states/repo";
import { CliError } from "../../types";
import { ClsNamespaces } from "../../utils/continuation-local-storage";
import { KeyMutex } from "../../utils/mutex/key-mutex";
import { checkIfExist } from "../../utils/util";

export class EventTxExecutor {
  private readonly _moduleStateRepo: IModuleStateRepo;
  private _eventSession: Namespace;
  private readonly _rootEvents: {
    [eventName: string]: {
      sender: string;
      contractBindingName: string;
      func: ContractFunction;
      resolveFunc: (() => void) | undefined;
      args: any[] | undefined;
    };
  };
  private _currentNumber: number;

  private _mutex: KeyMutex;

  constructor(eventSession: Namespace, moduleStateRepo: IModuleStateRepo) {
    this._rootEvents = {};
    this._eventSession = eventSession;
    this._currentNumber = 0;

    this._mutex = new KeyMutex();
    this._moduleStateRepo = moduleStateRepo;
  }

  public add(
    eventName: string,
    senderAddress: string,
    contractBindingName: string,
    fn: ContractFunction
  ) {
    if (checkIfExist(this._rootEvents[eventName])) {
      throw new CliError(
        `Execution is still blocked, something went wrong - ${eventName}`
      );
    }

    this._rootEvents[eventName] = {
      func: fn,
      sender: senderAddress,
      contractBindingName,
      args: undefined,
      resolveFunc: undefined,
    };
    this._currentNumber++;
  }

  public async executeSingle(
    eventName: string,
    ...args: any[]
  ): Promise<TransactionResponse> {
    this._rootEvents[eventName].args = args;

    return new Promise(async (resolve: () => void, reject) => {
      try {
        this._rootEvents[eventName].resolveFunc = resolve;
        await this.executeAll();
      } catch (e) {
        reject(e);
      }
    });
  }

  // this should be executed inside transaction executor.
  public async executeAll(): Promise<void> {
    const executionOrdering: { [address: string]: any } = {};

    for (const [eventName, rootEvent] of Object.entries(this._rootEvents)) {
      if (!executionOrdering[rootEvent.sender]) {
        executionOrdering[rootEvent.sender] = [];
      }

      executionOrdering[rootEvent.sender].push({
        eventName,
        event: rootEvent,
      });
    }

    // think how to execute this in batched way, currently is single execution

    const allSenders = [];
    for (const [sender, array] of Object.entries(executionOrdering)) {
      allSenders.push(this._executeSenderContractFunctions(sender, array));
    }
    await Promise.all(allSenders);

    this._currentNumber = 0;
  }

  private async _executeSenderContractFunctions(
    sender: string,
    array: any[]
  ): Promise<void> {
    for (const singleElement of array) {
      const args = singleElement.event.args;
      const func = singleElement.event.func;

      const eventName = singleElement.eventName;
      const bindingName = singleElement.event.contractBindingName;

      const resolve = await this._mutex.acquireQueued(sender);
      const tx = await func(...args);
      let transactionReceipt;
      try {
        transactionReceipt = tx;
        if (!checkIfExist(tx?.confirmations) || tx?.confirmations === 0) {
          transactionReceipt = await tx.wait(1);

          if (!this._eventSession.get(ClsNamespaces.PARALLELIZE)) {
            const blockConfirmation = this._eventSession.get(
              ClsNamespaces.BLOCK_CONFIRMATION_NUMBER
            );
            transactionReceipt = await tx.wait(blockConfirmation);
          }
        }
      } catch (e) {
        throw e;
      }
      resolve(); // potentially we can move unlock above tx confirmation
      await this._moduleStateRepo.storeEventTransactionData(
        bindingName,
        undefined,
        transactionReceipt,
        eventName
      );

      await singleElement.event.resolveFunc(transactionReceipt);

      delete this._rootEvents[eventName];
    }
  }
}
