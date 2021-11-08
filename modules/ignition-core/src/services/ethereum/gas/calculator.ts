import { TransactionRequest } from "@ethersproject/abstract-provider";
import { BigNumber } from "@ethersproject/bignumber";
import { providers } from "ethers";

import { checkIfExist } from "../../utils/util";

import { BytesLike, IGasProvider } from "./index";

export class GasPriceCalculator implements IGasProvider {
  private readonly _provider: providers.JsonRpcProvider;

  constructor(ethers: providers.JsonRpcProvider) {
    this._provider = ethers;
  }

  public async getCurrentPrice(): Promise<BigNumber> {
    return this._provider.getGasPrice();
  }

  public async estimateGas(
    fromAddr: string,
    toAddr: string | undefined,
    data: BytesLike
  ): Promise<BigNumber> {
    const txConfig: TransactionRequest = {
      from: fromAddr,
      data,
    };

    if (checkIfExist(toAddr)) {
      txConfig.to = toAddr;
    }

    return this._provider.estimateGas(txConfig);
  }
}
