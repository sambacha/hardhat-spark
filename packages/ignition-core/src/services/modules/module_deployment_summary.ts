import {
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "@ethersproject/abstract-provider";
import chalk from "chalk";
import { BigNumber, ethers } from "ethers";

import {
  ContractBindingMetaData,
  ContractInput,
  StatefulEvent,
  TxData,
} from "../../interfaces/hardhat_ignition";
import { ModuleStateFile } from "../types/module";
import { checkIfExist } from "../utils/util";

import { ModuleStateRepo } from "./states/repo/state_repo";

export enum SummaryType {
  "EMPTY" = "EMPTY",
  "JSON" = "JSON",
  "SIMPLE" = "SIMPLE",
  "ALL" = "ALL",
}

interface SummaryDataOption {
  time: boolean;
  totalEthers: boolean;
  totalGas: boolean;
  averageGasPrice: boolean;
  numberOfContract: boolean;
  numberOfEvents: boolean;
  numberOfTransactions: boolean;
}

const summaryDataOptions: { [type: string]: SummaryDataOption } = {
  EMPTY: {
    time: false,
    totalEthers: false,
    totalGas: false,
    averageGasPrice: false,
    numberOfContract: false,
    numberOfEvents: false,
    numberOfTransactions: false,
  },
  SIMPLE: {
    time: true,
    totalEthers: true,
    totalGas: true,
    averageGasPrice: true,
    numberOfContract: false,
    numberOfEvents: false,
    numberOfTransactions: false,
  },
  ALL: {
    time: true,
    totalEthers: true,
    totalGas: true,
    averageGasPrice: true,
    numberOfContract: true,
    numberOfEvents: true,
    numberOfTransactions: true,
  },
};

export class ModuleDeploymentSummaryService {
  private readonly _moduleStateRepo: ModuleStateRepo;
  private _startTime: Date;

  constructor(
    moduleStateRepo: ModuleStateRepo,
    summaryType: SummaryType = SummaryType.SIMPLE
  ) {
    this._moduleStateRepo = moduleStateRepo;
    this._startTime = new Date();
  }

  public async showSummary(
    moduleName: string,
    oldModuleState: ModuleStateFile
  ): Promise<string> {
    const elapsedTime = this._endTimer();
    const currentModuleState = await this._moduleStateRepo.getStateIfExist(
      moduleName
    );

    let totalWeiSpent = BigNumber.from(0);
    let totalGasSpent = BigNumber.from(0);
    let totalGasPrice = BigNumber.from(0);
    let numberOfTransactions = BigNumber.from(0);
    let numberOfContracts = BigNumber.from(0);
    let numberOfEvents = BigNumber.from(0);
    for (let [elementName, element] of Object.entries(currentModuleState)) {
      const transactionReceiptList: {
        input: Array<
          ContractInput | TxData | TransactionResponse | TransactionRequest
        >;
        output: TransactionReceipt[];
      } = {
        input: [],
        output: [],
      };
      if ((element as StatefulEvent)._isStatefulEvent) {
        element = element as StatefulEvent;
        const oldElement = oldModuleState[elementName] as StatefulEvent;
        if (oldElement?.executed === element?.executed) {
          continue;
        }

        if (!element?.executed) {
          continue;
        }

        numberOfEvents = numberOfEvents.add(1);
        for (const [, txObject] of Object.entries(element.txData)) {
          transactionReceiptList.input.push(...txObject.contractInput);
          transactionReceiptList.output.push(...txObject.contractOutput);
        }
      }

      if ((element as ContractBindingMetaData)._isContractBindingMetaData) {
        element = element as ContractBindingMetaData;
        const oldElement = oldModuleState[
          elementName
        ] as ContractBindingMetaData;
        if (
          oldElement?.deployMetaData?.contractAddress ===
          element?.deployMetaData?.contractAddress
        ) {
          continue;
        }

        if (element.deployMetaData.contractAddress === undefined) {
          continue;
        }

        if (checkIfExist(element.txData?.output) === undefined) {
          continue;
        }

        numberOfContracts = numberOfContracts.add(1);

        if (element.txData !== undefined) {
          transactionReceiptList.input.push(element.txData.input);
          if (element.txData.output !== undefined) {
            transactionReceiptList.output.push(element.txData.output);
          }
        }
      }

      numberOfTransactions = numberOfTransactions.add(
        transactionReceiptList.output.length
      );
      transactionReceiptList.input.forEach(
        (singleTxInput: any, index: number) => {
          const singleTxOutput = transactionReceiptList.output[index];

          let inputGasPrice;
          let outputGasUsed = BigNumber.from(0);
          if (singleTxOutput.gasUsed?._hex !== undefined) {
            outputGasUsed = BigNumber.from(singleTxOutput.gasUsed._hex);
          }

          if (!checkIfExist(singleTxInput.gasPrice?.hex)) {
            inputGasPrice = BigNumber.from(singleTxInput.gasPrice._hex);
          } else {
            inputGasPrice = BigNumber.from(singleTxInput.gasPrice.hex);
          }

          totalGasSpent = totalGasSpent.add(BigNumber.from(outputGasUsed));

          totalGasPrice = totalGasPrice.add(inputGasPrice);
          const wei = outputGasUsed.mul(inputGasPrice);
          totalWeiSpent = totalWeiSpent.add(wei);
        }
      );
    }

    let averageGasPrice = BigNumber.from(0);
    if (!numberOfTransactions.eq(0)) {
      averageGasPrice = totalGasPrice.div(numberOfTransactions);
    }

    return `
${chalk.bold(moduleName)} deployed successfully 🚀

${chalk.bold(numberOfTransactions.toString())} transactions used ${chalk.bold(
      totalGasSpent.toString()
    )} gas (avg price ${chalk.bold(averageGasPrice.toString())} wei)
Spent ${chalk.bold(
      ethers.utils.formatEther(totalWeiSpent.toString())
    )} ETH in ${chalk.bold(elapsedTime.toString())}s

Detailed log file saved to deployment/.logs/ignition.${moduleName.toLowerCase()}.$timestamp.log
`;
  }

  private _endTimer() {
    const endTime = new Date();
    return (endTime.getTime() - this._startTime.getTime()) / 1000;
  }
}
