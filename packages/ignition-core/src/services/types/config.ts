import { ethers } from 'ethers';

// export type HardhatIgnitionConfig = {
//   privateKeys: string[];
//   mnemonic?: string;
//   hdPath?: string;
//   networks?: {
//     [networkName: string]: {
//       networkId?: string;
//       rpcProvider?: string;
//       privateKeys?: string[];
//       mnemonic?: string;
//       hdPath?: string;
//       localDeployment?: boolean;
//       blockConfirmation?: number;
//       parallelizeDeployment?: boolean;
//       deploymentFilePath?: string;
//       gasPriceBackoff?: GasPriceBackoff;
//     };
//   };
//   parallelizeDeployment?: boolean;
//   registry?: IModuleRegistryResolver;
//   resolver?: IModuleRegistryResolver;
//   gasPriceProvider?: IGasPriceCalculator;
//   nonceManager?: INonceManager;
//   transactionSigner?: ITransactionSigner;
//   params?: { [name: string]: any };
// };

export type GasPriceBackoff = {
  maxGasPrice: ethers.BigNumberish | any;
  backoffTime: number;
  numberOfRetries: number;
};
