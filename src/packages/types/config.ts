import { IModuleRegistryResolver } from '../modules/states/registry';
import { IGasPriceCalculator } from '../ethereum/gas';
import { INonceManager, ITransactionSigner } from '../ethereum/transactions';

export type HardhatIgnitionConfig = {
  privateKeys: string[];
  mnemonic?: string;
  hdPath?: string;
  networks?: {
    [network_id: string]: {
      rpc_provider?: string;
      privateKeys?: string[];
      mnemonic?: string;
      hdPath?: string;
    }
  }
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasPriceCalculator,
  nonceManager?: INonceManager,
  transactionSigner?: ITransactionSigner
  params?: { [name: string]: any },
};
