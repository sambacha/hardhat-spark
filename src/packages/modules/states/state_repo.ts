import {
  Arguments,
  ContractBindingMetaData,
  DeployedContractBinding
} from "../../../interfaces/mortar";
import {checkIfEventsExist, checkIfExist} from "../../utils/util";
import {IStateRegistryResolver, ModuleState} from "./registry";
import {FileSystemStateRegistry} from "./registry/file_system";

export class ModuleStateRepo {
  private readonly networkId: number
  private stateRegistry: IStateRegistryResolver

  constructor(networkId: number, currentPath: string) {
    this.networkId = networkId
    this.stateRegistry = new FileSystemStateRegistry(currentPath)
  }

  setStateRegistry(stateRegistry: IStateRegistryResolver | null): void {
    if (stateRegistry == null) {
      return
    }

    this.stateRegistry = stateRegistry
  }

  async getStateIfExist(moduleName: string): Promise<ModuleState> {
    return this.stateRegistry.getModuleState(this.networkId, moduleName)
  }

  async storeNewState(moduleName: string, bindings: ModuleState | null): Promise<void> {
    await this.stateRegistry.storeStates(this.networkId, moduleName, bindings)
  }

  static convertBindingsToMetaData(bindings: ModuleState): { [p: string]: ContractBindingMetaData } {
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
