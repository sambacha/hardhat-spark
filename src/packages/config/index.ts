import { ethers } from 'ethers';
import { MortarConfig } from '../types/config';

export const CONFIG_FILENAME = 'mortar-config.json';
export const CONFIG_SCRIPT_NAME = 'mortar.config.ts';
export const NUMBER_OF_HD_ACCOUNTS = 100;

export interface IConfigService {
  getFirstPrivateKey(): string;
  getAllWallets(rpcPath: string): ethers.Wallet[];
  generateAndSaveConfig(privateKeys: string[], mnemonic: string, hdPath: string): boolean;
  getMortarConfig(currentPath: string, configScriptPath: string): Promise<MortarConfig>;
  saveEmptyMortarConfig(currentPath: string, configScriptPath: string): boolean;
}
