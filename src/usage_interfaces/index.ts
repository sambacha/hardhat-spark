import { Logging } from '../packages/utils/logging';

export type ConfigFlags = {
  networkId: string,
  networkName: string,
  stateFileNames: string[],
  rpcProvider?: string,
};

export interface IIgnitionUsage {
  deploy(migrationFilePath: string): Promise<void>;
  diff(deploymentFilePath: string): Promise<void>;
}

export interface IIgnition {
  deploy(args: DeployArgs): Promise<void>;
  diff(args: DiffArgs): Promise<void>;
  genTypes(args: GenTypesArgs): Promise<void>;
  migration(args: MigrationArgs): Promise<void>;
  tutorial(args: TutorialArgs): Promise<void>;
  usage(args: UsageArgs): Promise<void>;
}

export interface TutorialArgs {
}

export interface DiffArgs {
  moduleFilePath?: string;
  networkName?: string;
  state?: string;
  configScriptPath?: string;
}

export interface DeployArgs {
  moduleFilePath?: string;
  networkName?: string;
  rpcProvider?: string;
  parallelize?: boolean;
  logging?: Logging;
  state?: string;
  configScriptPath?: string;
  testEnv?: boolean;
}

export interface GenTypesArgs {
  moduleFilePath?: string;
  configScriptPath?: string;
}

export interface MigrationArgs {
  from?: string;
  moduleName: string;
}

export interface UsageArgs {
  moduleFilePath?: string;
  networkName?: string;
  testEnv?: boolean;
  state?: string;
  configScriptPath?: string;
}
