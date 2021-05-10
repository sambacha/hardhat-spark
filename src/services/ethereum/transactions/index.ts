import { ethers } from 'ethers';

export interface INonceManager {
  getAndIncrementTransactionCount(walletAddress: string): Promise<number>;
  getCurrentTransactionCount(walletAddress: string): Promise<number>;
}

export interface ITransactionSigner {
  generateSingedTx(value: number, data: string, wallet?: ethers.Wallet | undefined): Promise<string>;
}
