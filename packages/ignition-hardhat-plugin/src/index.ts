import { extendEnvironment, task, types } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { ActionType } from "hardhat/types";
import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { Module } from "ignition-core";
import inquirer from "inquirer";
import * as path from "path";

import { HardhatIgnition } from "./hardhat-ignition";
import "./type-extensions";
import { DeployTaskArgs, DiffTaskArgs, GenTypesTaskArgs } from "./types";
import { extractDataFromConfig } from "./utils/extractor";
import { SystemCrawlingService } from "./utils/system-crawler";

const DEFAULT_NETWORK_NAME = "local";
export const PluginName = "hardhat-ignition";
const DEFAULT_DEPLOYMENT_FOLDER = "deployment";

// TODO: Remove this
export async function loadScript(filePath: string): Promise<any> {
  const m = require(filePath);
  return m.default ?? m;
}

extendEnvironment((env) => {
  const networkName =
    env.network.name ?? env.config.defaultNetwork ?? DEFAULT_NETWORK_NAME;
  const chainId = String(
    env.network.config.chainId ?? env.config.networks[networkName].chainId
  );

  const { params, customServices, moduleParams } = extractDataFromConfig(
    networkName,
    chainId,
    env
  );

  env.ignition = lazyObject(
    () => new HardhatIgnition(params, customServices, moduleParams)
  );
});

const deploy: ActionType<DeployTaskArgs> = async (
  deployArgs: DeployTaskArgs,
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
          choices: deploymentModules.map((v: string) => {
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

  await env.run("compile");

  const modulePath = path.resolve(process.cwd(), filePath);
  const modules = await loadScript(modulePath);

  for (const [, module] of Object.entries<Module>(modules)) {
    await env.ignition.deploy(
      module,
      deployArgs.networkName,
      deployArgs.logging
    );
  }
};

const diff: ActionType<DiffTaskArgs> = async (
  diffArgs: DiffTaskArgs,
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
          choices: deploymentModules.map((v: string) => {
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

  await env.run("compile");

  const modules = loadScript(path.resolve(process.cwd(), filePath));
  for (const [, module] of Object.entries(modules)) {
    const logging = diffArgs.logging ?? true;
    await env.ignition.diff(module, diffArgs.networkName, logging);
  }
};

const genTypes: ActionType<GenTypesTaskArgs> = async (
  genTypesArgs: GenTypesTaskArgs,
  env: HardhatRuntimeEnvironment
) => {
  const modules = loadScript(
    path.resolve(process.cwd(), genTypesArgs.moduleFilePath)
  );

  await env.run("compile");

  for (const [, module] of Object.entries(modules)) {
    await env.ignition.genTypes(module, genTypesArgs.moduleFilePath);
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
    "local"
  )
  .addOptionalParam<boolean>(
    "logging",
    "Logging param can be used to turn on/off logging in ignition.",
    true,
    types.boolean
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
    "local"
  )
  .addOptionalParam<boolean>(
    "logging",
    "Logging param can be used to turn on/off logging in ignition.",
    true,
    types.boolean
  )
  .setAction(deploy);

task(
  "ignition:genTypes",
  "It'll generate .d.ts file for written deployment modules for better type hinting."
)
  .addPositionalParam("moduleFilePath", "Path to module deployment file.")
  .setAction(genTypes);
