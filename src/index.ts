// export {run} from '@oclif/command'

import {cli} from "cli-ux";
import ConfigService from "./packages/config/service";
import {OutputFlags} from "@oclif/parser/lib/parse";
import {DeployedContractBinding, Module} from "./interfaces/mortar";
import {checkIfExist} from "./packages/utils/util";
import {ModuleStateRepo} from "./packages/modules/states/state_repo";
import {ModuleResolver} from "./packages/modules/module_resolver";
import {EthTxGenerator} from "./packages/ethereum/transactions/generator";
import {Prompter} from "./packages/prompter";
import {TxExecutor} from "./packages/ethereum/transactions/executor";
import {StateResolver} from "./packages/modules/states/state_resolver";

export function init(flags: OutputFlags<any>, configService: ConfigService) {
  //@TODO(filip): add support for other signing ways (e.g. mnemonic, seed phrase, hd wallet, etc)
  configService.generateAndSaveConfig(flags.privateKey as string)

  cli.info("You have successfully configured mortar.")
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

  for (let [moduleName, moduleFunc] of Object.entries(modules)) {
    const module = (await moduleFunc) as Module
    moduleStateRepo.setStateRegistry(module.getRegistry())

    cli.info("\nDeploy module - ", moduleName)
    let stateRegistry = await moduleStateRepo.getStateIfExist(moduleName)
    for (let moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName)

      stateRegistry = StateResolver.mergeStates(stateRegistry, moduleState)
    }

    const resolvedBindings: { [p: string]: DeployedContractBinding } | null = moduleResolver.resolve(module.getAllBindings(), stateRegistry)
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

    moduleStateRepo.setStateRegistry(mod.getRegistry())

    let deployedState = await moduleStateRepo.getStateIfExist(moduleName)
    for (let moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName)

      deployedState = StateResolver.mergeStates(deployedState, moduleState)
    }

    if (moduleResolver.checkIfDiff(deployedState, moduleBindings)) {
      cli.info(`\nModule: ${moduleName}`)
      moduleResolver.printDiffParams(deployedState, moduleBindings)
    }
  }
}
