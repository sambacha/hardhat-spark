import { BigNumber } from "@ethersproject/bignumber";

export type Bytes = ArrayLike<number>;

export type BytesLike = Bytes | string;

export interface IGasPriceCalculator {
  getCurrentPrice(): Promise<BigNumber>;
}

export interface IGasCalculator {
  estimateGas(
    fromAddr: string,
    toAddr: string | undefined,
    data: BytesLike
  ): Promise<BigNumber>;
}

export interface IGasProvider extends IGasPriceCalculator, IGasCalculator {}
