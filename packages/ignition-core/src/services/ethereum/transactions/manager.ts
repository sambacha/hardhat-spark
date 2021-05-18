import { checkIfExist, delay } from '../../utils/util';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { INonceManager, ITransactionSigner } from './index';
import { BigNumber, providers } from 'ethers';
import { IGasCalculator, IGasPriceCalculator } from '../gas';
import { ethers } from 'ethers';
import {
  GasPriceBackoffError,
  NoNetworkError,
  TransactionFailed,
} from '../../types/errors';
import { GasPriceBackoff } from '../../types/config';
import { ILogging } from '../../utils/logging';

export class TransactionManager implements ITransactionSigner, INonceManager {
  private readonly nonceMap: { [address: string]: number };
  private provider: providers.JsonRpcProvider;
  private gasCalculator: IGasCalculator;
  private gasPriceCalculator: IGasPriceCalculator;
  private signer: ethers.Signer;
  private readonly networkId: string;
  private readonly prompter: ILogging;
  private readonly gasPriceBackoff: GasPriceBackoff | undefined;

  constructor(
    provider: providers.JsonRpcProvider,
    signer: ethers.Signer,
    networkId: string,
    gasCalculator: IGasCalculator,
    gasPriceCalculator: IGasPriceCalculator,
    prompter: ILogging,
    gasPriceBackoff?: GasPriceBackoff
  ) {
    this.provider = provider;
    this.nonceMap = {};
    this.signer = signer;
    this.networkId = networkId;
    this.gasCalculator = gasCalculator;
    this.gasPriceCalculator = gasPriceCalculator;
    this.gasPriceBackoff = gasPriceBackoff;
    this.prompter = prompter;
  }

  async getAndIncrementTransactionCount(
    walletAddress: string
  ): Promise<number> {
    if (!checkIfExist(this.nonceMap[walletAddress])) {
      this.nonceMap[walletAddress] = await this.provider.getTransactionCount(
        walletAddress
      );
      return this.nonceMap[walletAddress]++;
    }

    return this.nonceMap[walletAddress]++;
  }

  async getCurrentTransactionCount(walletAddress: string): Promise<number> {
    if (this.nonceMap[walletAddress]) {
      this.nonceMap[walletAddress] = await this.provider.getTransactionCount(
        walletAddress
      );
    }

    return this.nonceMap[walletAddress];
  }

  async generateSingedTx(
    value: number,
    data: string,
    signer?: ethers.Signer | undefined
  ): Promise<string> {
    let gas = BigNumber.from(0);
    const address = await this.signer.getAddress();
    try {
      gas = (await this.gasCalculator.estimateGas(
        address,
        undefined,
        data
      )) as BigNumber;
    } catch (err) {
      throw err;
    }

    let gasPrice = await this.gasPriceCalculator.getCurrentPrice();
    if (this.gasPriceBackoff && checkIfExist(this.gasPriceBackoff)) {
      gasPrice = await this.fetchBackoffGasPrice(
        this.gasPriceBackoff.numberOfRetries
      );
    }
    const tx: TransactionRequest = {
      from: address,
      value: value,
      gasPrice: gasPrice,
      gasLimit: gas,
      data: data,
      chainId: +this.networkId,
    };

    if (signer) {
      tx.from = address;
      tx.nonce = await this.getAndIncrementTransactionCount(
        await signer.getAddress()
      );
      return signer.signTransaction(tx);
    }

    tx.nonce = await this.getAndIncrementTransactionCount(
      address
    );
    return this.signer.signTransaction(tx);
  }

  async fetchBackoffGasPrice(retries: number): Promise<BigNumber> {
    let gasPrice = await this.gasPriceCalculator.getCurrentPrice();

    if (!this.gasPriceBackoff) {
      return gasPrice as BigNumber;
    }

    if (retries <= 0) {
      throw new GasPriceBackoffError(
        this.gasPriceBackoff.maxGasPrice.toString(),
        gasPrice.toString(),
        this.gasPriceBackoff.numberOfRetries,
        this.gasPriceBackoff.backoffTime
      );
    }
    if (checkIfExist(this.gasPriceBackoff)) {
      if (gasPrice > this.gasPriceBackoff.maxGasPrice) {
        this.prompter.gasPriceIsLarge(this.gasPriceBackoff.backoffTime);
        await delay(this.gasPriceBackoff.backoffTime);
        gasPrice = await this.fetchBackoffGasPrice(retries - 1);
      }
    }

    return gasPrice as BigNumber;
  }
}
