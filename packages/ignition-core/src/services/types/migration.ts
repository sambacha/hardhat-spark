import { TransactionReceipt } from "@ethersproject/abstract-provider";
import { ContractBindingMetaData } from "../../interfaces/hardhat_ignition";

export type ModuleFile = string;
export type ModuleStateBindings = { [name: string]: ContractBindingMetaData };

export const USAGE_FUNC = "buildUsage";
export const MODULE_FUNC = "buildModule";

export enum FileGenerationType {
  "usage" = "usage",
  "module" = "module",
}

export enum Migration {
  "truffle" = "truffle",
  "hardhatDeploy" = "hardhatDeploy",
}

export type Build = TruffleBuild | HardhatBuild;

export type HardhatBuild = {
  contractName: string;
  address: string;
  abi: Array<object>;
  transactionHash: string;
  receipt: TransactionReceipt;
  args: any[];
  bytecode: string;
  deployedBytecode: string;
  networkId: string;
};

export type TruffleBuild = {
  contractName: string;
  abi: Array<object>;
  metadata: string;
  bytecode: string;
  networks: {
    [networkId: string]: {
      events: { [eventHash: string]: object };
      address: string;
      transactionHash: string;
    };
  };
};
