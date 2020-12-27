import { checkIfExist } from '../../utils/util';
import { providers } from 'ethers';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { BigNumber } from '@ethersproject/bignumber';

export class GasCalculator {
  private readonly ethers: providers.JsonRpcProvider;

  constructor(ethers: providers.JsonRpcProvider) {
    this.ethers = ethers;
  }

  async getCurrentPrice(): Promise<BigNumber> {
    return await this.ethers.getGasPrice();
  }

  async estimateGas(fromAddr: string, toAddr: string | undefined, data: string): Promise<BigNumber> {
    const txConfig: TransactionRequest = {
      from: fromAddr,
      data: data,
    };

    if (checkIfExist(toAddr)) {
      txConfig.to = toAddr as string;
    }

    return this.ethers.estimateGas(txConfig);
  }
}
