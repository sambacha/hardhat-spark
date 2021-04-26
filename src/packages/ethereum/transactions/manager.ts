import { checkIfExist, delay } from '../../utils/util';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { INonceManager, ITransactionSigner } from './index';
import { BigNumber, providers } from 'ethers';
import { IGasCalculator, IGasPriceCalculator } from '../gas';
import { ethers } from 'ethers';
import { GasPriceBackoffError, NoNetworkError, TransactionFailed } from '../../types/errors';
import { GasPriceBackoff } from '../../types/config';
import { ILogging } from '../../utils/logging';

export class TransactionManager implements ITransactionSigner, INonceManager {
  private readonly nonceMap: { [address: string]: number };
  private provider: providers.JsonRpcProvider;
  private gasCalculator: IGasCalculator;
  private gasPriceCalculator: IGasPriceCalculator;
  private wallet: ethers.Wallet;
  private readonly networkId: string;
  private readonly prompter: ILogging;
  private readonly gasPriceBackoff: GasPriceBackoff | undefined;

  constructor(
    provider: providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    networkId: string,
    gasCalculator: IGasCalculator,
    gasPriceCalculator: IGasPriceCalculator,
    prompter: ILogging,
    gasPriceBackoff?: GasPriceBackoff,
  ) {
    this.provider = provider;
    this.nonceMap = {};
    this.wallet = wallet;
    this.networkId = networkId;
    this.gasCalculator = gasCalculator;
    this.gasPriceCalculator = gasPriceCalculator;
    this.gasPriceBackoff = gasPriceBackoff;
    this.prompter = prompter;
  }

  async getAndIncrementTransactionCount(walletAddress: string): Promise<number> {
    if (!checkIfExist((this.nonceMap)[walletAddress])) {
      (this.nonceMap)[walletAddress] = await this.provider.getTransactionCount(walletAddress);
      return (this.nonceMap)[walletAddress]++;
    }

    return (this.nonceMap)[walletAddress]++;
  }

  async getCurrentTransactionCount(walletAddress: string): Promise<number> {
    if ((this.nonceMap)[walletAddress]) {
      (this.nonceMap)[walletAddress] = await this.provider.getTransactionCount(walletAddress);
    }

    return (this.nonceMap)[walletAddress];
  }

  async generateSingedTx(value: number, data: string, wallet?: ethers.Wallet | undefined): Promise<string> {
    let gas = BigNumber.from(0);
    try {
      gas = await this.gasCalculator.estimateGas(this.wallet.address, undefined, data);
    } catch (err) {
      throw err;
    }

    let gasPrice = await this.gasPriceCalculator.getCurrentPrice();
    if (checkIfExist(this.gasPriceBackoff)) {
      gasPrice = await this.fetchBackoffGasPrice(this.gasPriceBackoff.numberOfRetries);
    }
    const tx: TransactionRequest = {
      from: this.wallet.address,
      value: value,
      gasPrice: gasPrice,
      gasLimit: gas,
      data: data,
      chainId: +this.networkId
    };

    if (wallet) {
      tx.from = wallet.address;
      tx.nonce = await this.getAndIncrementTransactionCount(await wallet.getAddress());
      return wallet.signTransaction(tx);
    }

    tx.nonce = await this.getAndIncrementTransactionCount(await this.wallet.getAddress());
    return this.wallet.signTransaction(tx);
  }

  async fetchBackoffGasPrice(retries: number): Promise<BigNumber> {
    let gasPrice = await this.gasPriceCalculator.getCurrentPrice();
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

    return gasPrice;
  }
}
