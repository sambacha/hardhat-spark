import { TransactionReceipt } from "@ethersproject/abstract-provider";

export type ModuleFile = string;

export const USAGE_FUNC = "buildUsage";
export const MODULE_FUNC = "buildModule";

export enum FileGenerationType {
  USAGE = "usage",
  MODULE = "module",
}

export enum Migration {
  TRUFFLE = "truffle",
  HARDHAT_DEPLOY = "hardhatDeploy",
}

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
