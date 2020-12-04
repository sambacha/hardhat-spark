// export {run} from '@oclif/command'

import {cli} from "cli-ux";
import ConfigService from "./packages/config/service";
import {OutputFlags} from "@oclif/parser/lib/parse";
import {DeployedContractBinding, Module} from "./interfaces/mortar";
import {checkIfExist} from "./packages/utils/util";
import {ModuleStateRepo} from "./packages/modules/state_repo";
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
  states: string[],
  moduleStateRepo: ModuleStateRepo,
  moduleResolver: ModuleResolver,
  txGenerator: EthTxGenerator,
  prompter: Prompter,
  txExecutor: TxExecutor
) {
  const modules = await require(migrationFilePath)

  for (let [moduleName, module] of Object.entries(modules)) {
    module = await module

    cli.info("\nDeploy module - ", moduleName)
    let deployedState = moduleStateRepo.getStateIfExist(moduleName)
    for (let moduleStateName of states) {
      const moduleState = moduleStateRepo.getStateIfExist(moduleStateName)

      deployedState = moduleStateRepo.mergeStates(deployedState, moduleState)
    }

    const resolvedBindings: { [p: string]: DeployedContractBinding } | null = moduleResolver.resolve((module as Module).getAllBindings(), deployedState)
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

export async function diff(resolvedPath: string, states: string[], moduleResolver: ModuleResolver, moduleStateRepo: ModuleStateRepo) {
  const modules = await require(resolvedPath)

  for (let [moduleName, module] of Object.entries(modules)) {
    const mod = await module as Module
    const moduleBindings = mod.getAllBindings()

    let deployedState = moduleStateRepo.getStateIfExist(moduleName)
    for (let moduleStateName of states) {
      const moduleState = moduleStateRepo.getStateIfExist(moduleStateName)

      deployedState = moduleStateRepo.mergeStates(deployedState, moduleState)
    }

    if (moduleResolver.checkIfDiff(deployedState, moduleBindings)) {
      moduleResolver.printDiffParams(deployedState, moduleBindings)
    }
  }
}
