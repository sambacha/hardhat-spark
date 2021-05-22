import { IGasPriceCalculator } from 'ignition-core';
import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';

export enum GasPriceType {
  'fast' = 'fast',
  'fastest' = 'fastest',
  'safeLow' = 'safeLow',
  'average' = 'average'
}

export class ConstantGasPrice implements IGasPriceCalculator {

  constructor() {
  }

  async getCurrentPrice(): Promise<BigNumber> {
    return ethers.utils.parseUnits('50', 'gwei') as BigNumber;
  }
}
