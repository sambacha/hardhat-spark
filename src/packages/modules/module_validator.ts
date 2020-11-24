import {ContractBinding} from "../../interfaces/mortar";
import {JsonFragment} from "../types/abi"

const CONSTRUCTOR_TYPE = 'constructor'

export class ModuleValidator {
  constructor() {
  }

  validate(bindings: { [name: string]: ContractBinding }, ABIs: { [name: string]: JsonFragment[]}): void {
    for (let [name, binding] of Object.entries(bindings)) {
      const abis = ABIs[name]
      let ABI = {} as JsonFragment
      for (let abi of abis) {
        if (abi.type == CONSTRUCTOR_TYPE) {
          ABI = abi
        }
      }

      if (binding.args.length != ABI.inputs?.length) {
        console.log("Binding didn't not match number of arguments for contract - ", name)
        console.log("  Expected ", ABI.inputs?.length, " and got ", binding.args.length, " number of arguments.")
        process.exit(0)
      }

      for (let i = 0; i < binding.args.length; i++) {
        switch (typeof binding.args[i]) {
          case "object": {
            if ("contract " + binding.args[i].name != ABI.inputs[i].internalType) {
              console.log("Unsupported type for - ", binding.name, " \n provided: ", binding.args[i].name, "\n expected: ", ABI.inputs[i].internalType)
              process.exit(0)
            }
            break
          }
          case "number": {
            // @TODO
            break
          }
          case "string": {
            // @TODO
            break
          }
          case "boolean": {
            // @TODO
            break
          } // @TODO: add support for big int types, and any other that seem relevant
          default: {
            console.log("Unsupported type for - ", binding.name, " ", binding.args[i])
            process.exit(0)
          }
        }
      }
    }
  }
}
