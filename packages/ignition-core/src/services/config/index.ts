import { ethers } from "ethers";

export * from "./global_config_service";

export interface IConfigService {
  getFirstPrivateKey(): string;
  getAllWallets(provider: ethers.providers.JsonRpcProvider): ethers.Wallet[];
}
