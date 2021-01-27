import { ethers } from 'ethers';

export interface INonceManager {
  getTransactionCount(walletAddress: string): Promise<number>;
}

export interface ITransactionSigner {
  generateSingedTx(value: number, data: string, wallet?: ethers.Wallet | undefined): Promise<string>;
}
