import { TransactionRequest } from "@ethersproject/abstract-provider";
import { BigNumber, ethers, providers } from "ethers";

import { GasPriceBackoff } from "../../types/config";
import { GasPriceBackoffError } from "../../types/errors";
import { ILogging } from "../../utils/logging";
import { checkIfExist, delay } from "../../utils/util";
import { IGasCalculator, IGasPriceCalculator } from "../gas";

import { INonceManager, ITransactionSigner } from "./index";

export class TransactionManager implements ITransactionSigner, INonceManager {
  private readonly _nonceMap: { [address: string]: number };
  private _provider: providers.JsonRpcProvider;
  private _gasCalculator: IGasCalculator;
  private _gasPriceCalculator: IGasPriceCalculator;
  private _signer: ethers.Signer;
  private readonly _networkId: string;
  private readonly _prompter: ILogging;
  private readonly _gasPriceBackoff: GasPriceBackoff | undefined;

  constructor(
    provider: providers.JsonRpcProvider,
    signer: ethers.Signer,
    networkId: string,
    gasCalculator: IGasCalculator,
    gasPriceCalculator: IGasPriceCalculator,
    prompter: ILogging,
    gasPriceBackoff?: GasPriceBackoff
  ) {
    this._provider = provider;
    this._nonceMap = {};
    this._signer = signer;
    this._networkId = networkId;
    this._gasCalculator = gasCalculator;
    this._gasPriceCalculator = gasPriceCalculator;
    this._gasPriceBackoff = gasPriceBackoff;
    this._prompter = prompter;
  }

  public async getAndIncrementTransactionCount(
    walletAddress: string
  ): Promise<number> {
    if (!checkIfExist(this._nonceMap[walletAddress])) {
      this._nonceMap[walletAddress] = await this._provider.getTransactionCount(
        walletAddress
      );
      return this._nonceMap[walletAddress]++;
    }

    return this._nonceMap[walletAddress]++;
  }

  public async getCurrentTransactionCount(
    walletAddress: string
  ): Promise<number> {
    if (this._nonceMap[walletAddress] !== undefined) {
      this._nonceMap[walletAddress] = await this._provider.getTransactionCount(
        walletAddress
      );
    }

    return this._nonceMap[walletAddress];
  }

  public async generateSingedTx(
    value: number,
    data: string,
    signer?: ethers.Signer | undefined
  ): Promise<string> {
    let gas = BigNumber.from(0);
    const address = await this._signer.getAddress();
    try {
      gas = (await this._gasCalculator.estimateGas(
        address,
        undefined,
        data
      )) as BigNumber;
    } catch (err) {
      throw err;
    }

    let gasPrice = await this._gasPriceCalculator.getCurrentPrice();
    if (
      this._gasPriceBackoff !== undefined &&
      checkIfExist(this._gasPriceBackoff)
    ) {
      gasPrice = await this.fetchBackoffGasPrice(
        this._gasPriceBackoff.numberOfRetries
      );
    }
    const tx: TransactionRequest = {
      from: address,
      value,
      gasPrice,
      gasLimit: gas,
      data,
      chainId: +this._networkId,
    };

    if (signer !== undefined) {
      tx.from = address;
      tx.nonce = await this.getAndIncrementTransactionCount(
        await signer.getAddress()
      );
      return signer.signTransaction(tx);
    }

    tx.nonce = await this.getAndIncrementTransactionCount(address);
    return this._signer.signTransaction(tx);
  }

  public async fetchBackoffGasPrice(retries: number): Promise<BigNumber> {
    let gasPrice = await this._gasPriceCalculator.getCurrentPrice();

    if (this._gasPriceBackoff === undefined) {
      return gasPrice as BigNumber;
    }

    if (retries <= 0) {
      throw new GasPriceBackoffError(
        this._gasPriceBackoff.maxGasPrice.toString(),
        gasPrice.toString(),
        this._gasPriceBackoff.numberOfRetries,
        this._gasPriceBackoff.backoffTime
      );
    }
    if (checkIfExist(this._gasPriceBackoff)) {
      if (gasPrice.gt(this._gasPriceBackoff.maxGasPrice)) {
        this._prompter.gasPriceIsLarge(this._gasPriceBackoff.backoffTime);
        await delay(this._gasPriceBackoff.backoffTime);
        gasPrice = await this.fetchBackoffGasPrice(retries - 1);
      }
    }

    return gasPrice as BigNumber;
  }
}
