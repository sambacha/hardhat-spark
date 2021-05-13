import { extendEnvironment, task } from 'hardhat/config';
import { lazyObject } from 'hardhat/plugins';
import { ActionType } from 'hardhat/types';
import {
  DeployArgs,
  DiffArgs,
  GenTypesArgs,
  Logging
} from 'ignition-core';
import './type_extentions';
import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime';
import { HardhatIgnition } from '../index';

export const PluginName = 'hardhat-ignition';

extendEnvironment(env => {
  env.ignition = lazyObject(() => new HardhatIgnition());
});

const diff: ActionType<DiffArgs> = async (
  diffArgs: DiffArgs,
  env: HardhatRuntimeEnvironment,
) => {
  await env.ignition.diff(diffArgs);
};

const deploy: ActionType<DeployArgs> = async (
  deployArgs: DeployArgs,
  env: HardhatRuntimeEnvironment,

) => {
  await env.ignition.deploy(deployArgs);
};

const genTypes: ActionType<GenTypesArgs> = async (
  genTypesArgs: GenTypesArgs,
  env: HardhatRuntimeEnvironment,
) => {
  await  env.ignition.genTypes(genTypesArgs);
};

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
    'Network name is specified inside your config file and if their is none it will default to local (http://localhost:8545)',
    'local',
    undefined,
  )
  .addOptionalParam<Logging>(
    'logging',
    'Logging options: streamlined, simple or json',
    Logging.overview,
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
