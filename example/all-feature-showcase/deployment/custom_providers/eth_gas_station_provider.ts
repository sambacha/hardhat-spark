import { IGasPriceCalculator, IGasProvider } from '../../../../src/packages/ethereum/gas';
import { BigNumber } from '@ethersproject/bignumber';
import axios from 'axios';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { checkIfExist } from '../../../../src/packages/utils/util';

export enum GasPriceType {
  'fast' = 'fast',
  'fastest' = 'fastest',
  'safeLow' = 'safeLow',
  'average' = 'average'
}

export class EthGasStationProvider implements IGasPriceCalculator {
  private readonly apiKey: string;
  private readonly gasPriceType: GasPriceType;

  constructor(apiKey: string, type: GasPriceType) {
    this.apiKey = apiKey;
    this.gasPriceType = type;
  }

  async getCurrentPrice(): Promise<BigNumber> {
    const url = `https://ethgasstation.info/api/ethgasAPI.json?api-key=${this.apiKey}`;

    const resp = await axios.get(url);

    const data = resp.data;

    return data[this.gasPriceType];
  }
}
