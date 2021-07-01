import { TransactionReceipt } from "@ethersproject/abstract-provider";

export type ModuleFile = string;

export const USAGE_FUNC = "buildUsage";
export const MODULE_FUNC = "buildModule";

/* eslint-disable @typescript-eslint/naming-convention */
export enum FileGenerationType {
  "usage" = "usage",
  "module" = "module",
}

export enum Migration {
  "truffle" = "truffle",
  "hardhatDeploy" = "hardhatDeploy",
}
/* eslint-enable @typescript-eslint/naming-convention */

export type Build = TruffleBuild | HardhatBuild;

export interface HardhatBuild {
  contractName: string;
  address: string;
  abi: object[];
  transactionHash: string;
  receipt: TransactionReceipt;
  args: any[];
  bytecode: string;
  deployedBytecode: string;
  networkId: string;
}

export interface TruffleBuild {
  contractName: string;
  abi: object[];
  metadata: string;
  bytecode: string;
  networks: {
    [networkId: string]: {
      events: { [eventHash: string]: object };
      address: string;
      transactionHash: string;
    };
  };
}
