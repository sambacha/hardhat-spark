import { TransactionRequest } from '@ethersproject/abstract-provider';
import { ethers, providers } from 'ethers';
import { checkIfExist, IGasPriceCalculator, IGasCalculator, INonceManager, ITransactionSigner } from 'ignition-core';

export class TransactionManager implements ITransactionSigner, INonceManager {
  private readonly nonceMap: { [address: string]: number };
  private provider: providers.JsonRpcProvider;
  private gasCalculator: IGasCalculator;
  private gasPriceCalculator: IGasPriceCalculator;
  private wallet: ethers.Wallet;
  private readonly networkId: string;

  constructor(
    provider: providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    networkId: string,
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

  async generateSingedTx(value: number, data: string, signer?: ethers.Signer | undefined): Promise<string> {
    const gas = await this.gasCalculator.estimateGas(this.wallet.address, undefined, data);

    const tx: TransactionRequest = {
      from: this.wallet.address,
      value: value,
      gasPrice: await this.gasPriceCalculator.getCurrentPrice(),
      gasLimit: gas,
      data: data,
      chainId: +this.networkId
    };

    if (signer) {
      tx.from = await signer.getAddress();
      tx.nonce = await this.getAndIncrementTransactionCount(tx.from);
      return signer.signTransaction(tx);
    }

    tx.nonce = await this.getAndIncrementTransactionCount(this.wallet.address);
    return this.wallet.signTransaction(tx);
  }
}
