import { ethers } from 'ethers';
import { IgnitionConfig } from '../types/config';

export { IgnitionConfig } from '../types/config';

export const CONFIG_FILENAME = 'ignition-config.json';
export const CONFIG_SCRIPT_NAME = 'ignition.config.ts';
export const NUMBER_OF_HD_ACCOUNTS = 100;

export interface IConfigService {
  getFirstPrivateKey(): string;
  getAllWallets(rpcPath?: string): ethers.Wallet[];
  generateAndSaveConfig(privateKeys: string[], mnemonic: string, hdPath: string): boolean;
  getIgnitionConfig(currentPath: string, configScriptPath: string): Promise<IgnitionConfig>;
  saveEmptyIgnitionConfig(currentPath: string, configScriptPath: string, reinit?: boolean): boolean;
}
