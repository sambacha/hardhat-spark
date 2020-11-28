import {CompiledContractBinding, DeployedContractBinding} from "../../../interfaces/mortar";
import {checkIfExist} from "../../utils/util";

export class EventHandler {
  constructor() {
  }

  static async executeAfterDeployEventHook(binding: DeployedContractBinding, bindings: { [p: string]: DeployedContractBinding }): Promise<void> {
    const events = binding.events.afterDeploy
    if (!checkIfExist(events)) {
      return
    }

    for (let event of events) {
      const fn = event.fn
      const deps = event.deps


      let binds: DeployedContractBinding[] = []
      for (let dependency of deps) {
        const name = dependency.name
        binds.push(bindings[name])
      }

      fn(binding, ...binds)
    }
  }

  static async executeAfterCompileEventHook(binding: CompiledContractBinding, bindings: { [p: string]: CompiledContractBinding }): Promise<void> {
    const events = binding.events.afterCompile
    if (!checkIfExist(events)) {
      return
    }

    for (let event of events) {
      const fn = event.fn
      const deps = event.deps


      let binds: CompiledContractBinding[] = []
      for (let dependency of deps) {
        const name = dependency.name
        binds.push(bindings[name])
      }

      fn(binding, ...binds)
    }
  }
}
