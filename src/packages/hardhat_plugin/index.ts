import { extendEnvironment, task } from 'hardhat/config';
import { lazyObject } from 'hardhat/plugins';
import { ActionType } from 'hardhat/types';
import { Logging } from '../utils/logging';
import { Migration } from '../types/migration';
import {
  DeployArgs,
  DiffArgs,
  GenTypesArgs,
  MigrationArgs,
  TutorialArgs,
  UsageArgs
} from '../../usage_interfaces';
import { HardhatIgnition, IgnitionHardhatActions } from '../../usage_interfaces/hardhat_plugin';
import './type_extentions';

export const PluginName = 'hardhat-ignition';

extendEnvironment(env => {
  env.ignition = lazyObject(() => new HardhatIgnition());
});

const tutorial: ActionType<TutorialArgs> = async (
  tutorialArgs: TutorialArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await IgnitionHardhatActions.tutorial(tutorialArgs);
};

const diff: ActionType<DiffArgs> = async (
  diffArgs: DiffArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await IgnitionHardhatActions.diff(diffArgs);
};

const deploy: ActionType<DeployArgs> = async (
  deployArgs: DeployArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await IgnitionHardhatActions.deploy(deployArgs);
};

const genTypes: ActionType<GenTypesArgs> = async (
  genTypesArgs: GenTypesArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await IgnitionHardhatActions.genTypes(genTypesArgs);
};

const migration: ActionType<MigrationArgs> = async (
  migrationArgs: MigrationArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await IgnitionHardhatActions.migration(migrationArgs);
};

const usage: ActionType<UsageArgs> = async (
  usageArgs: UsageArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await IgnitionHardhatActions.usage(usageArgs);
};

task('ignition:tutorial', 'Easiest way to get started with hardhat-ignition, create couple contracts and start deploying.')
  .setAction(tutorial);

task('ignition:diff', 'Difference between deployed and current deployment.')
  .addOptionalPositionalParam(
     'moduleFilePath',
    'Path to module deployment file.'
  )
  .addOptionalParam<string>(
    'networkName',
    'Network name is specified inside your config file and if their is none it will default to local(http://localhost:8545)',
    'local',
    undefined,
  )
  .addOptionalParam<string>(
    'state',
    'Provide name of module\'s that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other.',
    '',
  )
  .addOptionalParam<string>(
    'configScriptPath',
    'Path to the hardhat-ignition.config.js script, default is same as current path.',
  )
  .setAction(diff);

task('ignition:deploy', 'Deploy new module, difference between current module and already deployed one.')
  .addOptionalPositionalParam(
    'moduleFilePath',
    'Path to module deployment file.'
  )
  .addOptionalParam<string>(
    'networkName',
    'Network name is specified inside your config file and if their is none it will default to local(http://localhost:8545)',
    'local',
    undefined,
  )
  .addOptionalParam<Logging>(
    'logging',
    'Logging options: streamlined, simple or json. default: streamlined',
    Logging.simple,
    undefined,
  )
  .addOptionalParam<string>(
    'rpcProvider',
    'RPC Provider - URL of open RPC interface for your ethereum node.',
    undefined,
    undefined,
  )
  .addOptionalParam<string>(
    'state',
    'Provide name of module\'s that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other.',
    '',
  )
  .addFlag(
    'parallelize',
    'If this flag is provided hardhat-ignition will try to parallelize transactions, this mean that it will batch transaction and track dynamically their confirmation.',
  )
  .addFlag(
    'testEnv',
    'This should be provided in case of test and/or CI/CD, it means that no state file will be store.'
  )
  .setAction(deploy);

task('ignition:genTypes', 'It\'ll generate .d.ts file for written deployment modules for better type hinting.')
  .addOptionalPositionalParam(
    'moduleFilePath',
    'Path to module deployment file.'
  )
  .addOptionalPositionalParam<string>(
    'configScriptPath',
    'Path to the hardhat-ignition.config.js script, default is same as current path.',
    undefined,
    undefined,
  )
  .setAction(genTypes);

task('ignition:migration', 'Migrate deployment meta data from other deployers to hardhat-ignition state file.')
  .addParam<Migration>(
    'from',
    'Deployment package name (truffle, hardhatDeploy)',
    Migration.truffle,
    undefined,
    true
  )
  .addParam<string>(
    'moduleName',
    'Module name for which you would like to migrate state file to.',
    undefined,
    undefined,
    false,
  )
  .setAction(migration);

task('ignition:usage', 'Generate public usage module from standard module.')
  .addOptionalPositionalParam(
    'moduleFilePath',
    'Path to module deployment file.'
  )
  .addParam<string>(
    'networkName',
    'Network name is specified inside your config file and if their is none it will default to local(http://localhost:8545)',
    'local',
    undefined,
    true,
  )
  .addOptionalParam<string>(
    'configScriptPath',
    'Path to the hardhat-ignition.config.js script, default is same as current path.',
    undefined,
    undefined,
  )
  .addOptionalParam<string>(
    'state',
    'Provide name of module\'s that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other.',
    '',
    undefined,
  )
  .addFlag(
    'testEnv',
    'This should be provided in case of test and/or CI/CD, it means that no state file will be store.'
  )
  .setAction(usage);
