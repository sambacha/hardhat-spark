import { ModuleStateRepo } from './states/state_repo';
import { ModuleStateFile } from './states/module';
import { ContractBindingMetaData, StatefulEvent } from '../../interfaces/hardhat_ignition';
import { BigNumber, ethers } from 'ethers';
import { checkIfExist } from '../utils/util';
import { cli } from 'cli-ux';
import chalk from 'chalk';
import { getIgnitionVersion } from '../utils/package_info';

export enum SummaryType {
  'EMPTY' = 'EMPTY',
  'JSON' = 'JSON',
  'SIMPLE' = 'SIMPLE',
  'ALL' = 'ALL'
}

type SummaryDataOption = {
  time: boolean
  totalEthers: boolean
  totalGas: boolean
  averageGasPrice: boolean
  numberOfContract: boolean
  numberOfEvents: boolean
  numberOfTransactions: boolean
};

const summaryDataOptions: { [type: string]: SummaryDataOption } = {
  'EMPTY': {
    time: false,
    totalEthers: false,
    totalGas: false,
    averageGasPrice: false,
    numberOfContract: false,
    numberOfEvents: false,
    numberOfTransactions: false,
  },
  'SIMPLE': {
    time: true,
    totalEthers: true,
    totalGas: true,
    averageGasPrice: true,
    numberOfContract: false,
    numberOfEvents: false,
    numberOfTransactions: false,
  },
  'ALL': {
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
  private summaryDataOptions: SummaryDataOption;

  constructor(moduleStateRepo: ModuleStateRepo, summaryType: SummaryType = SummaryType.SIMPLE) {
    this.moduleStateRepo = moduleStateRepo;
    this.timerStart();
  }

  private timerStart() {
    this.startTime = new Date();
  }

  private endTimer() {
    const endTime = new Date();
    return (endTime.getTime() - this.startTime.getTime()) / 1000;
  }

  async showSummary(moduleName: string, oldModuleState: ModuleStateFile): Promise<string> {
    const elapsedTime = this.endTimer();
    const currentModuleState = await this.moduleStateRepo.getStateIfExist(moduleName);

    let totalWeiSpent = BigNumber.from(0);
    let totalGasSpent = BigNumber.from(0);
    let totalGasPrice = BigNumber.from(0);
    let numberOfTransactions = BigNumber.from(0);
    let numberOfContracts = BigNumber.from(0);
    let numberOfEvents = BigNumber.from(0);
    for (let [elementName, element] of Object.entries(currentModuleState)) {
      let transactionReceiptList = {
        input: [],
        output: [],
      };
      if ((element as StatefulEvent)._isStatefulEvent == true) {
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
          transactionReceiptList = {
            input: txObject.contractInput,
            output: txObject.contractOutput,
          };
        }
      }

      if ((element as ContractBindingMetaData)._isContractBindingMetaData == true) {
        element = element as ContractBindingMetaData;
        const oldElement = oldModuleState[elementName] as ContractBindingMetaData;
        if (oldElement?.deployMetaData?.contractAddress == element?.deployMetaData?.contractAddress) {
          continue;
        }

        if (!element.deployMetaData.contractAddress) {
          continue;
        }

        if (!checkIfExist(element?.txData?.input)) {
          continue;
        }

        numberOfContracts = numberOfContracts.add(1);
        transactionReceiptList.input.push(element.txData.input);
        transactionReceiptList.output.push(element.txData.output);
      }

      numberOfTransactions = numberOfTransactions.add(Object.entries(transactionReceiptList).length);
      transactionReceiptList.input.forEach((singleTxInput: any, index: number) => {
        const singleTxOutput = transactionReceiptList.output[index];

        totalGasSpent = totalGasSpent.add(BigNumber.from(singleTxOutput.gasUsed.hex));

        totalGasPrice = totalGasPrice.add(BigNumber.from(singleTxInput.gasPrice.hex));
        const wei = BigNumber.from(singleTxOutput.gasUsed).mul(BigNumber.from(singleTxInput.gasPrice.hex));
        totalWeiSpent = totalWeiSpent.add(wei);
      });
    }

    let averageGasPrice = BigNumber.from(0);
    if (!numberOfTransactions.eq(0)) {
      averageGasPrice = totalGasPrice.div(numberOfTransactions);
    }

    return `
${chalk.bold(moduleName)} deployed successfully 🚀

${chalk.bold(numberOfTransactions.toString())} transactions used ${chalk.bold(totalGasSpent.toString())} gas (avg price ${chalk.bold(averageGasPrice.toString())} wei)
Spent ${chalk.bold(ethers.utils.formatEther(totalWeiSpent.toString()))} ETH in ${chalk.bold(elapsedTime.toString())}s

Detailed log file saved to deployment/.logs/ignition.${moduleName.toLowerCase()}.$timestamp.log
`;
  }
}
