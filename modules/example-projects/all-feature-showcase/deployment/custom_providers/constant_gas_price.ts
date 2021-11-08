import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "ethers";
import { IGasPriceCalculator } from "ignition-core";

export enum GasPriceType {
  "fast" = "fast",
  "fastest" = "fastest",
  "safeLow" = "safeLow",
  "average" = "average",
}

export class ConstantGasPrice implements IGasPriceCalculator {
  constructor() {}

  public async getCurrentPrice(): Promise<BigNumber> {
    return ethers.utils.parseUnits("50", "gwei") as BigNumber;
  }
}
