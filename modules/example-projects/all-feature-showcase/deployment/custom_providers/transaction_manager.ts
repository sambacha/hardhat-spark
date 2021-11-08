import { TransactionRequest } from "@ethersproject/abstract-provider";
import { ethers, providers } from "ethers";
import {
  checkIfExist,
  IGasCalculator,
  IGasPriceCalculator,
  INonceManager,
  ITransactionSigner,
} from "ignition-core";

export class TransactionManager implements ITransactionSigner, INonceManager {
  private readonly _nonceMap: { [address: string]: number };
  private _provider: providers.JsonRpcProvider;
  private _gasCalculator: IGasCalculator;
  private _gasPriceCalculator: IGasPriceCalculator;
  private _wallet: ethers.Wallet;
  private readonly _networkId: string;

  constructor(
    provider: providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    networkId: string,
    gasCalculator: IGasCalculator,
    gasPriceCalculator: IGasPriceCalculator
  ) {
    this._provider = provider;
    this._nonceMap = {};
    this._wallet = wallet;
    this._networkId = networkId;
    this._gasCalculator = gasCalculator;
    this._gasPriceCalculator = gasPriceCalculator;
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
    if (this._nonceMap[walletAddress]) {
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
    const gas = await this._gasCalculator.estimateGas(
      this._wallet.address,
      undefined,
      data
    );

    const tx: TransactionRequest = {
      from: this._wallet.address,
      value,
      gasPrice: await this._gasPriceCalculator.getCurrentPrice(),
      gasLimit: gas,
      data,
      chainId: +this._networkId,
    };

    if (signer) {
      tx.from = await signer.getAddress();
      tx.nonce = await this.getAndIncrementTransactionCount(tx.from);
      return signer.signTransaction(tx);
    }

    tx.nonce = await this.getAndIncrementTransactionCount(this._wallet.address);
    return this._wallet.signTransaction(tx);
  }
}
