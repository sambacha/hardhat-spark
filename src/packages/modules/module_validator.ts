import {ContractBinding} from "../../interfaces/mortar";
import {JsonFragment} from "../types/abi"
import {handleTypes} from "../types/checker";
import {AbiMismatch} from "../types/errors";

const CONSTRUCTOR_TYPE = 'constructor'

export class ModuleValidator {
  constructor() {
  }

  validate(bindings: { [name: string]: ContractBinding }, ABIs: { [name: string]: JsonFragment[] }): void {
    for (let [name, binding] of Object.entries(bindings)) {
      const abis = ABIs[name]
      let ABI = {} as JsonFragment
      for (let abi of abis) {
        if (abi.type == CONSTRUCTOR_TYPE) {
          ABI = abi
        }
      }

      if (binding.args.length != ABI.inputs?.length) {
        throw new AbiMismatch(`Binding did not match number of arguments for contract - ${name}
  Expected ${String(ABI.inputs?.length || 0)} and got ${String(binding.args.length)} number of arguments.`)
      }

      for (let i = 0; i < binding.args.length; i++) {
        const type = ABI.inputs[i].type
        const internalType = ABI.inputs[i].internalType

        handleTypes(binding.name, binding.args[i], type, internalType)
      }
    }
  }
}