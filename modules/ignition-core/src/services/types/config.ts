import { ethers } from "ethers";

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
//   gasPriceProvider?: IGasPriceCalculator;
//   nonceManager?: INonceManager;
//   transactionSigner?: ITransactionSigner;
//   params?: { [name: string]: any };
// };

export interface GasPriceBackoff {
  maxGasPrice: ethers.BigNumberish | any;
  backoffTime: number;
  numberOfRetries: number;
}
