import { ethers } from 'ethers';

export const CONFIG_FILENAME = 'mortar-config.json';
export const CONFIG_SCRIPT_NAME = 'mortar.config.ts';
export const NUMBER_OF_HD_ACCOUNTS = 100;

export interface IConfigService {
  getFirstPrivateKey(): string;
  getAllWallets(rpcPath: string): ethers.Wallet[];
  generateAndSaveConfig(privateKeys: string[], mnemonic: string, hdPath: string): boolean;
}
