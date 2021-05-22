import { ModuleStateRepo } from "./states/state_repo";
import { ModuleStateFile } from "./states/module";
import {
  ContractBindingMetaData,
  ContractInput,
  StatefulEvent,
  TxData,
} from "../../interfaces/hardhat_ignition";
import { BigNumber, ethers } from "ethers";
import { checkIfExist } from "../utils/util";
import { cli } from "cli-ux";
import chalk from "chalk";
import { getIgnitionVersion } from "../utils/package_info";
import {
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "@ethersproject/abstract-provider";

export enum SummaryType {
  "EMPTY" = "EMPTY",
  "JSON" = "JSON",
  "SIMPLE" = "SIMPLE",
  "ALL" = "ALL",
}

type SummaryDataOption = {
  time: boolean;
  totalEthers: boolean;
  totalGas: boolean;
  averageGasPrice: boolean;
  numberOfContract: boolean;
  numberOfEvents: boolean;
  numberOfTransactions: boolean;
};

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
  private readonly moduleStateRepo: ModuleStateRepo;
  private startTime: Date;

  constructor(
    moduleStateRepo: ModuleStateRepo,
    summaryType: SummaryType = SummaryType.SIMPLE
  ) {
    this.moduleStateRepo = moduleStateRepo;
    this.startTime = new Date();
  }

  private endTimer() {
    const endTime = new Date();
    return (endTime.getTime() - this.startTime.getTime()) / 1000;
  }

  async showSummary(
    moduleName: string,
    oldModuleState: ModuleStateFile
  ): Promise<string> {
    const elapsedTime = this.endTimer();
    const currentModuleState = await this.moduleStateRepo.getStateIfExist(
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
        output: Array<TransactionReceipt>;
      } = {
        input: [],
        output: [],
      };
      if ((element as StatefulEvent)._isStatefulEvent) {
        element = element as StatefulEvent;
        const oldElement = oldModuleState[elementName] as StatefulEvent;
        if (oldElement?.executed == element?.executed) {
          continue;
        }

        if (!element?.executed) {
          continue;
        }

        numberOfEvents = numberOfEvents.add(1);
        for (const [, txObject] of Object.entries(element.txData)) {
          // @ts-ignore
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
          oldElement?.deployMetaData?.contractAddress ==
          element?.deployMetaData?.contractAddress
        ) {
          continue;
        }

        if (!element.deployMetaData.contractAddress) {
          continue;
        }

        if (!checkIfExist(element.txData?.output)) {
          continue;
        }

        numberOfContracts = numberOfContracts.add(1);

        if (element.txData) {
          transactionReceiptList.input.push(element.txData.input);
          if (element.txData.output) {
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
          if (singleTxOutput && singleTxOutput.gasUsed) {
            // @ts-ignore
            if (!singleTxOutput.gasUsed?.hex) {
              outputGasUsed = BigNumber.from(singleTxOutput.gasUsed._hex);
            } else {
              // @ts-ignore
              outputGasUsed = BigNumber.from(singleTxOutput.gasUsed.hex);
            }
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
}
