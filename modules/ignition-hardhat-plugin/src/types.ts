export interface DiffTaskArgs {
  moduleFilePath?: string;
  networkName: string;
  logging: boolean;
}

export interface DeployTaskArgs {
  moduleFilePath?: string;
  networkName: string;
  logging: boolean;
}

export interface GenTypesTaskArgs {
  moduleFilePath: string;
}
