import { loadScript } from "common";
import { extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { ActionType } from "hardhat/types";
import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import {
  DeployArgs,
  DiffArgs,
  GenTypesArgs,
  Module,
  SystemCrawlingService,
} from "ignition-core";
import inquirer from "inquirer";
import * as path from "path";

import { HardhatIgnition } from "../index";
import { extractDataFromConfig } from "../utils/extractor";

import "./type_extentions";

const DEFAULT_NETWORK_NAME = "local";
export const PluginName = "hardhat-ignition";
const DEFAULT_DEPLOYMENT_FOLDER = "deployments";

extendEnvironment((env) => {
  const networkName =
    env.network.name ?? env.config.defaultNetwork ?? DEFAULT_NETWORK_NAME;
  const chainId = String(
    env.network.config.chainId ?? env.config.networks[networkName].chainId
  );

  const { params, customServices, repos, moduleParams } = extractDataFromConfig(
    networkName,
    chainId,
    env.config
  );

  env.ignition = lazyObject(
    () => new HardhatIgnition(params, customServices, repos, moduleParams)
  );
});

const deploy: ActionType<DeployArgs> = async (
  deployArgs: DeployArgs,
  env: HardhatRuntimeEnvironment
) => {
  let filePath =
    deployArgs.moduleFilePath ??
    env.config.networks[env.network.name].deploymentFilePath;
  if (filePath === undefined) {
    const systemCrawlingService = new SystemCrawlingService(
      process.cwd(),
      DEFAULT_DEPLOYMENT_FOLDER
    );
    const deploymentModules = systemCrawlingService.crawlDeploymentModule();
    const deploymentFileName = (
      await inquirer.prompt([
        {
          name: "deploymentFileName",
          message: "Deployments file:",
          type: "list",
          choices: deploymentModules.map((v) => {
            return {
              name: v,
            };
          }),
        },
      ])
    ).deploymentFileName;
    try {
      filePath = path.resolve(DEFAULT_DEPLOYMENT_FOLDER, deploymentFileName);
    } catch (e) {
      throw e;
    }
  }

  const modulePath = path.resolve(process.cwd(), filePath);
  const modules = await loadScript(modulePath);
  for (const [, moduleFunc] of Object.entries(modules)) {
    // TODO: See the other comments about this
    const module = (await moduleFunc) as Module;

    const logging = deployArgs.logging ?? true;
    await env.ignition.deploy(module, deployArgs.networkName, logging);
  }
};

const diff: ActionType<DiffArgs> = async (
  diffArgs: DiffArgs,
  env: HardhatRuntimeEnvironment
) => {
  let filePath =
    diffArgs.moduleFilePath ??
    env.config.networks[env.network.name].deploymentFilePath;
  if (filePath === undefined) {
    const systemCrawlingService = new SystemCrawlingService(
      process.cwd(),
      DEFAULT_DEPLOYMENT_FOLDER
    );
    const deploymentModules = systemCrawlingService.crawlDeploymentModule();
    const deploymentFileName = (
      await inquirer.prompt([
        {
          name: "deploymentFileName",
          message: "Deployments file:",
          type: "list",
          choices: deploymentModules.map((v) => {
            return {
              name: v,
            };
          }),
        },
      ])
    ).deploymentFileName;
    try {
      filePath = path.resolve(DEFAULT_DEPLOYMENT_FOLDER, deploymentFileName);
    } catch (e) {
      throw e;
    }
  }
  const modules = loadScript(path.resolve(process.cwd(), filePath));
  for (const [, moduleFunc] of Object.entries(modules)) {
    // TODO: See the other comments about this
    const module = (await moduleFunc) as Module;

    const logging = diffArgs.logging ?? true;
    await env.ignition.diff(module, diffArgs.networkName, logging);
  }
};

const genTypes: ActionType<GenTypesArgs> = async (
  genTypesArgs: GenTypesArgs,
  env: HardhatRuntimeEnvironment
) => {
  const modules = loadScript(
    path.resolve(process.cwd(), genTypesArgs.deploymentFolder)
  );
  for (const [, moduleFunc] of Object.entries(modules)) {
    // TODO: See the other comments about this
    const module = (await moduleFunc) as Module;

    await env.ignition.genTypes(module, genTypesArgs.deploymentFolder);
  }
};

task("ignition:diff", "Difference between deployed and current deployment.")
  .addOptionalPositionalParam(
    "moduleFilePath",
    "Path to module deployment file."
  )
  .addOptionalParam<string>(
    "networkName",
    "Network name is specified inside your config file and if their is none it will default to local(http://localhost:8545)",
    "local",
    undefined
  )
  .addOptionalParam<boolean>(
    "logging",
    "Logging param can be used to turn on/off logging in ignition.",
    undefined,
    undefined
  )
  .setAction(diff);

task(
  "ignition:deploy",
  "Deploy new module, difference between current module and already deployed one."
)
  .addOptionalPositionalParam(
    "moduleFilePath",
    "Path to module deployment file."
  )
  .addOptionalParam<string>(
    "networkName",
    "Network name is specified inside your config file and if their is none it will default to (http://localhost:8545)",
    "local",
    undefined
  )
  .addOptionalParam<boolean>(
    "logging",
    "Logging param can be used to turn on/off logging in ignition.",
    undefined,
    undefined
  )
  .addFlag(
    "testEnv",
    "This should be provided in case of test and/or CI/CD, it means that no state file will be store."
  )
  .setAction(deploy);

task(
  "ignition:genTypes",
  "It'll generate .d.ts file for written deployment modules for better type hinting."
)
  .addOptionalPositionalParam(
    "moduleFilePath",
    "Path to module deployment file."
  )
  .setAction(genTypes);
