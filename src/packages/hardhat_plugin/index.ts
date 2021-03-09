import { extendEnvironment, task } from 'hardhat/config';
import { lazyObject } from 'hardhat/plugins';
import { ActionType } from 'hardhat/types';
import { Prompters } from '../utils/promter';
import { Migration } from '../types/migration';
import {
  DeployArgs,
  DiffArgs,
  GenTypesArgs,
  InitArgs,
  MigrationArgs,
  TutorialArgs,
  UsageArgs
} from '../../usage_interfaces';
import { MortarHardhat, MortarHardhatActions } from '../../usage_interfaces/hardhat_plugin';
import './type_extentions';

export const PluginName = 'mortar';

extendEnvironment(env => {
  env.mortar = lazyObject(() => new MortarHardhat(env.config.mortar));
});

const tutorial: ActionType<TutorialArgs> = async (
  tutorialArgs: TutorialArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await MortarHardhatActions.tutorial(config.mortar, tutorialArgs);
};

const diff: ActionType<DiffArgs> = async (
  diffArgs: DiffArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await MortarHardhatActions.diff(config.mortar, diffArgs);
};

const deploy: ActionType<DeployArgs> = async (
  deployArgs: DeployArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await MortarHardhatActions.deploy(config.mortar, deployArgs);
};

const genTypes: ActionType<GenTypesArgs> = async (
  genTypesArgs: GenTypesArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await MortarHardhatActions.genTypes(config.mortar, genTypesArgs);
};

const init: ActionType<InitArgs> = async (
  initArgs: InitArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await MortarHardhatActions.init(config.mortar, initArgs);
};

const migration: ActionType<MigrationArgs> = async (
  migrationArgs: MigrationArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await MortarHardhatActions.migration(config.mortar, migrationArgs);
};

const usage: ActionType<UsageArgs> = async (
  usageArgs: UsageArgs,
  {
    config,
    hardhatArguments,
    run
  }
) => {
  await MortarHardhatActions.usage(config.mortar, usageArgs);
};

task('mortar:tutorial', 'Easiest way to get started with mortar, create couple contracts and start deploying.')
  .setAction(tutorial);

task('mortar:diff', 'Difference between deployed and current deployment.')
  .addPositionalParam(
     'moduleFilePath',
    'Path to module deployment file.'
  )
  .addParam<string>(
    'networkId',
    'Network ID of the network you are willing to deploy your contracts.',
    undefined,
    undefined,
    false,
  )
  .addOptionalParam<string>(
    'state',
    'Provide name of module\'s that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other.',
    '',
  )
  .addOptionalParam<string>(
    'configScriptPath',
    'Path to the mortar.config.js script, default is same as current path.',
  )
  .setAction(diff);

task('mortar:deploy', 'Deploy new module, difference between current module and already deployed one.')
  .addPositionalParam(
    'moduleFilePath',
    'Path to module deployment file.'
  )
  .addParam<string>(
    'networkId',
    'Network ID of the network you are willing to deploy your contracts.',
    undefined,
    undefined,
    false,
  )
  .addParam<Prompters>(
    'prompting',
    'Prompting type: streamlined, overview or json. default: overview',
    Prompters.simple,
    undefined,
    true,
  )
  .addParam<string>(
    'rpcProvider',
    'RPC Provider - URL of open RPC interface for your ethereum node.',
    undefined,
    undefined,
    true,
  )
  .addOptionalParam<string>(
    'state',
    'Provide name of module\'s that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other.',
    '',
  )
  .addFlag(
    'parallelize',
    'If this flag is provided mortar will try to parallelize transactions, this mean that it will batch transaction and track dynamically their confirmation.',
  )
  .addFlag(
    'testEnv',
    'This should be provided in case of test and/or CI/CD, it means that no state file will be store.'
  )
  .setAction(deploy);

task('mortar:genTypes', 'It\'ll generate .d.ts file for written deployment modules for better type hinting.')
  .addPositionalParam<string>(
    'configScriptPath',
    'Path to the mortar.config.js script, default is same as current path.',
    undefined,
    undefined,
    true
  )
  .setAction(genTypes);

task('mortar:init', 'Initialize mortar configuration file and configuration script.')
  .addParam<string>(
    'privateKeys',
    'Private Keys of the deployer accounts e.g. 0x123...,0x123...,0x123',
    undefined,
    undefined,
    false,
  )
  .addParam<string>(
    'mnemonic',
    'Mnemonic of the deployer accounts',
    undefined,
    undefined,
    true,
  )
  .addParam<string>(
    'hdPath',
    'Associated with mnemonic - The HD parent of all the derived keys. Default value: "m/44\'/60\'/0\'/0"',
    undefined,
    undefined,
    true,
  )
  .addParam<string>(
    'configScriptPath',
    'Path to the mortar.config.js script, default is same as current path.',
    undefined,
    undefined,
  )
  .addFlag(
    'reinit',
    'Provide this flag if you would like to overwrite `mortar.config.ts`, otherwise if exists, it would error.'
  )
  .setAction(init);

task('mortar:migration', 'Migrate deployment meta data from other deployers to mortar state file.')
  .addParam<Migration>(
    'from',
    'Deployment package name (truffle)',
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

task('mortar:usage', 'Generate public usage module from standard module.')
  .addPositionalParam(
    'moduleFilePath',
    'Path to module deployment file.'
  )
  .addParam<string>(
    'networkId',
    'Network ID of the network you are willing to deploy your contracts.',
    undefined,
    undefined,
    false,
  )
  .addOptionalParam<string>(
    'configScriptPath',
    'Path to the mortar.config.js script, default is same as current path.',
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
