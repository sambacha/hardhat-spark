import { ethers } from 'ethers';

export const CONFIG_SCRIPT_NAME = 'hardhat-ignition.config.ts';
export const NUMBER_OF_HD_ACCOUNTS = 100;

export * from './global_config_service';

export interface IConfigService {
  getFirstPrivateKey(): string;
  getAllWallets(provider: ethers.providers.JsonRpcProvider): ethers.Wallet[];
}
