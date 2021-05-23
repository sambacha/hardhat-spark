import {
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/abstract-provider";
import { ContractFunction } from "@ethersproject/contracts";
import { Namespace } from "cls-hooked";

import { IModuleStateRepo } from "../../modules/states/repo";
import { CliError } from "../../types/errors";
import { clsNamespaces } from "../../utils/continuation_local_storage";
import { KeyMutex } from "../../utils/mutex/key_mutex";
import { checkIfExist } from "../../utils/util";

export class EventTxExecutor {
  private readonly moduleStateRepo: IModuleStateRepo;
  private eventSession: Namespace;
  private readonly rootEvents: {
    [eventName: string]: {
      sender: string;
      contractBindingName: string;
      func: ContractFunction;
      resolveFunc: Function | undefined;
      args: any[] | undefined;
    };
  };
  private currentNumber: number;

  private mutex: KeyMutex;

  constructor(eventSession: Namespace, moduleStateRepo: IModuleStateRepo) {
    this.rootEvents = {};
    this.eventSession = eventSession;
    this.currentNumber = 0;

    this.mutex = new KeyMutex();
    this.moduleStateRepo = moduleStateRepo;
  }

  public add(
    eventName: string,
    senderAddress: string,
    contractBindingName: string,
    fn: ContractFunction
  ) {
    if (checkIfExist(this.rootEvents[eventName])) {
      throw new CliError(
        `Execution is still blocked, something went wrong - ${eventName}`
      );
    }

    this.rootEvents[eventName] = {
      func: fn,
      sender: senderAddress,
      contractBindingName,
      args: undefined,
      resolveFunc: undefined,
    };
    this.currentNumber++;
  }

  public async executeSingle(
    eventName: string,
    ...args: any[]
  ): Promise<TransactionResponse> {
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

  // this should be executed inside transaction executor.
  public async executeAll(): Promise<void> {
    const executionOrdering: { [address: string]: any } = {};

    for (const [eventName, rootEvent] of Object.entries(this.rootEvents)) {
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
      allSenders.push(this.executeSenderContractFunctions(sender, array));
    }
    await Promise.all(allSenders);

    this.currentNumber = 0;
  }

  private async executeSenderContractFunctions(
    sender: string,
    array: any[]
  ): Promise<void> {
    for (const singleElement of array) {
      const args = singleElement.event.args;
      const func = singleElement.event.func;

      const eventName = singleElement.eventName;
      const bindingName = singleElement.event.contractBindingName;

      const resolve = await this.mutex.acquireQueued(sender);
      const tx = await func(...args);
      let transactionReceipt;
      try {
        transactionReceipt = tx;
        if (!checkIfExist(tx?.confirmations) || tx?.confirmations == 0) {
          transactionReceipt = await tx.wait(1);

          if (!this.eventSession.get(clsNamespaces.PARALLELIZE)) {
            const blockConfirmation = +(
              process.env.BLOCK_CONFIRMATION_NUMBER || 1
            );
            transactionReceipt = await tx.wait(blockConfirmation);
          }
        }
      } catch (e) {
        throw e;
      }
      resolve(); // potentially we can move unlock above tx confirmation
      await this.moduleStateRepo.storeEventTransactionData(
        bindingName,
        undefined,
        transactionReceipt,
        eventName
      );

      await singleElement.event.resolveFunc(transactionReceipt);

      delete this.rootEvents[eventName];
    }
  }
}
