export type ConfigFlags = {
  networkId: number,
  stateFileNames: string[],
  rpcProvider?: string,
};

export interface IMortarUsage {
  deploy(migrationFilePath: string): Promise<void>;
  diff(deploymentFilePath: string): Promise<void>;
}
