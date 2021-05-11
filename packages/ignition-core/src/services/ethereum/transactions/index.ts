import { ethers } from 'ethers';

export * from './manager';
export * from './generator';
export * from './executor';
export * from './event_executor';


export interface INonceManager {
  getAndIncrementTransactionCount(walletAddress: string): Promise<number>;
  getCurrentTransactionCount(walletAddress: string): Promise<number>;
}

export interface ITransactionSigner {
  generateSingedTx(value: number, data: string, wallet?: ethers.Wallet | undefined): Promise<string>;
}
