import { ModuleState, ModuleStateFile } from '../../modules/states/module';
import { BigNumber } from '@ethersproject/bignumber';

export interface IGasPriceCalculator {
  getCurrentPrice(): Promise<BigNumber>;
}

export interface IGasCalculator {
  estimateGas(fromAddr: string, toAddr: string | undefined, data: string): Promise<BigNumber>;
}

export interface IGasProvider extends IGasPriceCalculator, IGasCalculator {
}
