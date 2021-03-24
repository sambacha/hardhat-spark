import { ethers } from 'ethers';
import { HardhatIgnitionConfig } from '../types/config';

export { HardhatIgnitionConfig } from '../types/config';

export const CONFIG_FILENAME = 'hardhat-ignition-config.json';
export const CONFIG_SCRIPT_NAME = 'hardhat-ignition.config.ts';
export const NUMBER_OF_HD_ACCOUNTS = 100;

export interface IConfigService {
  getFirstPrivateKey(): string;
  getAllWallets(rpcPath?: string): ethers.Wallet[];
  generateAndSaveConfig(privateKeys: string[], mnemonic: string, hdPath: string): boolean;
  getIgnitionConfig(currentPath: string, configScriptPath: string): Promise<HardhatIgnitionConfig>;
  saveEmptyIgnitionConfig(currentPath: string, configScriptPath: string, reinit?: boolean): boolean;
}
