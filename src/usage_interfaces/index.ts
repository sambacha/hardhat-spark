import { Prompters } from '../packages/utils/promter';

export type ConfigFlags = {
  networkId: number,
  stateFileNames: string[],
  rpcProvider?: string,
};

export interface IIgnitionUsage {
  deploy(migrationFilePath: string): Promise<void>;
  diff(deploymentFilePath: string): Promise<void>;
}

export interface IIgnition {
  deploy(moduleFilePath: string, args: DeployArgs): Promise<void>;
  diff(moduleFilePath: string, args: DiffArgs): Promise<void>;
  genTypes(moduleFilePath: string, args: GenTypesArgs): Promise<void>;
  migration(args: MigrationArgs): Promise<void>;
  tutorial(args: TutorialArgs): Promise<void>;
  usage(moduleFilePath: string, args: UsageArgs): Promise<void>;
}

export interface TutorialArgs {
}

export interface DiffArgs {
  moduleFilePath: string;
  networkId: string;
  state?: string;
  configScriptPath?: string;
}

export interface DeployArgs {
  moduleFilePath: string;
  networkId: string;
  rpcProvider?: string;
  parallelize?: boolean;
  prompting?: Prompters;
  state?: string;
  configScriptPath?: string;
  testEnv?: boolean;
}

export interface GenTypesArgs {
  moduleFilePath: string;
  configScriptPath?: string;
}

export interface InitArgs {
  privateKeys: string;
  mnemonic?: string;
  configScriptPath?: string;
  hdPath?: string;
  reinit?: string;
}

export interface MigrationArgs {
  from?: string;
  moduleName: string;
}

export interface UsageArgs {
  moduleFilePath: string;
  networkId: string;
  testEnv?: boolean;
  state?: string;
  configScriptPath?: string;
}
