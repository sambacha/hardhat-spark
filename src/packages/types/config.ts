import { IModuleRegistryResolver } from '../modules/states/registry';
import { IGasPriceCalculator } from '../ethereum/gas';
import { INonceManager, ITransactionSigner } from '../ethereum/transactions';

export type Config = {
  privateKeys: string[];
  mnemonic?: string;
  hdPath?: string;
};

export type IgnitionConfig = {
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasPriceCalculator,
  nonceManager?: INonceManager,
  transactionSinger?: ITransactionSigner
  params?: {[name: string]: any},
};
