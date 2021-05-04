import { IModuleRegistryResolver } from '../modules/states/registry';
import { IGasPriceCalculator } from '../ethereum/gas';
import { INonceManager, ITransactionSigner } from '../ethereum/transactions';
import { ethers } from 'ethers';

export type HardhatIgnitionConfig = {
  privateKeys: string[];
  mnemonic?: string;
  hdPath?: string;
  networks?: {
    [networkName: string]: {
      networkId?: string;
      rpcProvider?: string;
      privateKeys?: string[];
      mnemonic?: string;
      hdPath?: string;
      localDeployment?: boolean;
      deploymentFilePath?: string;
      blockConfirmation?: number;
      parallelizeDeployment?: boolean;
      gasPriceBackoff?: GasPriceBackoff;
    }
  }
  parallelizeDeployment?: boolean;
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasPriceCalculator,
  nonceManager?: INonceManager,
  transactionSigner?: ITransactionSigner,
  params?: { [name: string]: any },
};

export type GasPriceBackoff = {
  maxGasPrice: ethers.BigNumber;
  backoffTime: number;
  numberOfRetries: number;
};
