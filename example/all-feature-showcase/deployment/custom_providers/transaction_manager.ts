import { TransactionRequest } from '@ethersproject/abstract-provider';
import { providers } from 'ethers';
import { IGasCalculator, IGasPriceCalculator } from '../../../../src';
import { ethers } from 'ethers';
import { INonceManager, ITransactionSigner } from '../../../../src';
import { checkIfExist } from '../../../../lib/packages/utils/util';

export class TransactionManager implements ITransactionSigner, INonceManager {
  private readonly nonceMap: { [address: string]: number };
  private provider: providers.JsonRpcProvider;
  private gasCalculator: IGasCalculator;
  private gasPriceCalculator: IGasPriceCalculator;
  private wallet: ethers.Wallet;
  private readonly networkId: number;

  constructor(
    provider: providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    networkId: number,
    gasCalculator: IGasCalculator,
    gasPriceCalculator: IGasPriceCalculator,
  ) {
    this.provider = provider;
    this.nonceMap = {};
    this.wallet = wallet;
    this.networkId = networkId;
    this.gasCalculator = gasCalculator;
    this.gasPriceCalculator = gasPriceCalculator;
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
    const gas = await this.gasCalculator.estimateGas(this.wallet.address, undefined, data);

    const tx: TransactionRequest = {
      from: this.wallet.address,
      value: value,
      gasPrice: await this.gasPriceCalculator.getCurrentPrice(),
      gasLimit: gas,
      data: data,
      chainId: this.networkId
    };

    if (wallet) {
      tx.from = wallet.address;
      tx.nonce = await this.getAndIncrementTransactionCount(await wallet.getAddress());
      return wallet.signTransaction(tx);
    }

    tx.nonce = await this.getAndIncrementTransactionCount(await this.wallet.getAddress());
    return this.wallet.signTransaction(tx);
  }
}
