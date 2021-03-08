import { TransactionReceipt } from '@ethersproject/abstract-provider';

export enum Migration {
  'truffle' = 'truffle',
  'hardhatDeploy' = 'hardhatDeploy'
}

export type Build = TruffleBuild | HardhatBuild;

export type HardhatBuild = {
  contractName?: string;
  address: string;
  abi: Array<object>;
  transactionHash: string;
  receipt: TransactionReceipt;
  args: any[];
  bytecode: string;
  deployedBytecode: string;
  networkId?: string
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
    }
  }
};
