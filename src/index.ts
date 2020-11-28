export {run} from '@oclif/command'

import {cli} from "cli-ux";
import ConfigService from "./packages/config/service";
import path from "path";
import {OutputArgs, OutputFlags} from "@oclif/parser/lib/parse";
import {DeployedContractBinding, Module} from "./interfaces/mortar";
import {checkIfExist} from "./packages/utils/util";
import {ModuleBucketRepo} from "./packages/modules/bucket_repo";
import {ModuleResolver} from "./packages/modules/module_resolver";
import {EthTxGenerator} from "./packages/ethereum/transactions/generator";
import {Prompter} from "./packages/prompter";
import {TxExecutor} from "./packages/ethereum/transactions/executor";

export function init(flags: OutputFlags<any>, configService: ConfigService) {
  //@TODO(filip): add support for other signing ways (e.g. mnemonic, seed phrase, hd wallet, etc)
  configService.generateAndSaveConfig(flags.privateKey as string)

  cli.info("You have successfully configured mortar.")
  // @TODO: iterate over abi and generate TS interface
}

export async function deploy(
  migrationFilePath: string,
  moduleBucket: ModuleBucketRepo,
  moduleResolver: ModuleResolver,
  txGenerator: EthTxGenerator,
  prompter: Prompter,
  txExecutor: TxExecutor
) {
  const modules = await require(migrationFilePath)

  for (let [moduleName, module] of Object.entries(modules)) {
    module = await module
    console.log(module)

    cli.info("\nDeploy module - ", moduleName)
    let deployedBucket = moduleBucket.getBucketIfExist()
    if (deployedBucket == null) {
      deployedBucket = {}
    }

    const resolvedBindings: { [p: string]: DeployedContractBinding } | null = moduleResolver.resolve((module as Module).getAllBindings(), deployedBucket)
    if (!checkIfExist(resolvedBindings)) {
      cli.info("Nothing to deploy")
      process.exit(0)
    }

    const bindings = txGenerator.initTx(resolvedBindings as { [p: string]: DeployedContractBinding })
    prompter.promptDeployerBindings(bindings)

    await prompter.promptContinueDeployment()
    await txExecutor.executeBindings(moduleName, bindings)
  }
}

export function diff(flags: OutputFlags<any>, args: OutputArgs<any>) {
  const currentPath = process.cwd()
  const filePath = args.path as string
  if (filePath == "") {
    cli.info("Path argument missing from command. \nPlease use --help to better understand usage of this command")
  }
  require(path.resolve(currentPath, filePath))
}
