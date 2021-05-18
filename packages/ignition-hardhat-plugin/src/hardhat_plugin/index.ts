import * as path from 'path';
import { extendEnvironment, task } from 'hardhat/config';
import { lazyObject } from 'hardhat/plugins';
import { ActionType } from 'hardhat/types';
import {
  DeployArgs,
  DiffArgs,
  GenTypesArgs,
  Module
} from 'ignition-core';
import './type_extentions';
import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime';
import { HardhatIgnition } from '../index';
import { extractDataFromConfig } from '../utils/extractor';
import { loadScript } from 'common/typescript';

const DEFAULT_NETWORK_NAME = 'local';
export const PluginName = 'hardhat-ignition';

extendEnvironment((env) => {
  const networkName = env.network.name || env.config.defaultNetwork || DEFAULT_NETWORK_NAME;
  const chainId = String(env.network.config.chainId || env.config.networks[networkName].chainId);

  const {
    params,
    customServices,
    repos,
    moduleParams
  } = extractDataFromConfig(networkName, chainId, env.config);

  env.ignition = lazyObject(() => new HardhatIgnition(
    params,
    customServices,
    repos,
    moduleParams
  ));
});

const deploy: ActionType<DeployArgs> = async (
  deployArgs: DeployArgs,
  env: HardhatRuntimeEnvironment
) => {
  const modules = loadScript(path.resolve(process.cwd(), deployArgs.moduleFilePath));
  for (const [, moduleFunc] of Object.entries(modules)) {
    const module = (await moduleFunc) as Module;

    await env.ignition.deploy(module, deployArgs.networkName);
  }
};

const diff: ActionType<DiffArgs> = async (
  diffArgs: DiffArgs,
  env: HardhatRuntimeEnvironment
) => {
  const modules = loadScript(path.resolve(process.cwd(), diffArgs.moduleFilePath));
  for (const [, moduleFunc] of Object.entries(modules)) {
    const module = (await moduleFunc) as Module;

    await env.ignition.diff(module, diffArgs.networkName);
  }
};

const genTypes: ActionType<GenTypesArgs> = async (
  genTypesArgs: GenTypesArgs,
  env: HardhatRuntimeEnvironment
) => {
  const modules = loadScript(path.resolve(process.cwd(), genTypesArgs.deploymentFolder));
  for (const [, moduleFunc] of Object.entries(modules)) {
    const module = (await moduleFunc) as Module;

    await env.ignition.genTypes(module, genTypesArgs.deploymentFolder);
  }
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
    undefined
  )
  .addOptionalParam<boolean>(
    'logging',
    'Logging options: streamlined, simple or json',
    true,
    undefined
  )
  .setAction(diff);

task(
  'ignition:deploy',
  'Deploy new module, difference between current module and already deployed one.'
)
  .addOptionalPositionalParam(
    'moduleFilePath',
    'Path to module deployment file.'
  )
  .addOptionalParam<string>(
    'networkName',
    'Network name is specified inside your config file and if their is none it will default to local (http://localhost:8545)',
    'local',
    undefined
  )
  .addOptionalParam<boolean>(
    'logging',
    'Logging options: streamlined, simple or json',
    true,
    undefined
  )
  .addFlag(
    'testEnv',
    'This should be provided in case of test and/or CI/CD, it means that no state file will be store.'
  )
  .setAction(deploy);

task(
  'ignition:genTypes',
  "It'll generate .d.ts file for written deployment modules for better type hinting."
)
  .addOptionalPositionalParam(
    'moduleFilePath',
    'Path to module deployment file.'
  )
  .setAction(genTypes);
