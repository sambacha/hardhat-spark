import * as fs from "fs";
import * as path from "path";
import {
  Arguments,
  ContractBindingMetaData,
  DeployedContractBinding
} from "../../interfaces/mortar";
import {ModuleResolver} from "./module_resolver";
import {checkIfEventsExist, checkIfExist} from "../utils/util";
import {BindingsConflict} from "../types/errors";

const STATE_DIR_NAME = '.mortar'
const STATE_NAME = 'deployed_module_state.json'

export type ModuleState = { [p: string]: DeployedContractBinding }

export class ModuleStateRepo {
  private readonly networkId: number
  private readonly statePath: string
  private moduleResolver: ModuleResolver

  constructor(networkId: number, statePath: string, moduleResolver: ModuleResolver) {
    const dir = path.resolve(statePath, STATE_DIR_NAME)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    this.networkId = networkId
    this.statePath = dir
    this.moduleResolver = moduleResolver
  }

  getStateIfExist(moduleName: string): ModuleState {
    const dir = path.resolve(this.statePath, moduleName, `${this.networkId}_${STATE_NAME}`)
    if (!fs.existsSync(dir)) {
      return {}
    }

    return JSON.parse(fs.readFileSync(dir, {
      encoding: 'UTF-8'
    })) || {}
  }

  mergeStates(mainModuleState: ModuleState, newModuleState: ModuleState): ModuleState {
    for (let [bindingName, binding] of Object.entries(newModuleState)) {
      if (checkIfExist(mainModuleState[bindingName])) {
        throw new BindingsConflict(`Conflict in bindings when merging multiple state files. \n    Check your state files for same binding name. Use --help for more detailed description.`)
      }

      mainModuleState[bindingName] = binding
    }

    return mainModuleState
  }

  storeNewState(moduleName: string, bindings: ModuleState | null): void {
    if (bindings == null) {
      return
    }

    const moduleDir = path.resolve(this.statePath, moduleName)
    const metaData = ModuleStateRepo.convertBindingsToMetaData(bindings)
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir)
    }

    const stateDir = path.resolve(moduleDir, `${this.networkId}_${STATE_NAME}`)
    fs.writeFileSync(stateDir, JSON.stringify(metaData, null, 4))
    return
  }

  private static convertBindingsToMetaData(bindings: ModuleState): { [p: string]: ContractBindingMetaData } {
    const metaData: { [p: string]: ContractBindingMetaData } = {}

    for (let [bindingName, binding] of Object.entries(bindings)) {
      binding.args = this.convertArg(binding.args)
      metaData[bindingName] = new ContractBindingMetaData(binding.name, binding.args, binding.bytecode, binding.abi, binding.txData)
    }

    return metaData
  }

  private static convertArg(args: Arguments): Arguments {
    if (!checkIfExist(args)) {
      return args
    }

    for (let i = 0; i < args.length; i++) {
      const events = (args[i] as DeployedContractBinding).events
      if (!checkIfExist(events)) {
        continue
      }

      if (checkIfEventsExist(events)) {
        args[i] = new ContractBindingMetaData(args[i].name, args[i].args, args[i].bytecode, args[i].abi, args[i].txData)
      }

      args[i].args = this.convertArg(args[i].args)
    }

    return args
  }
}
