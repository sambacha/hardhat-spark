export enum Migration {
  'truffle' = 'truffle',
}

export type Build = TruffleBuild;

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
