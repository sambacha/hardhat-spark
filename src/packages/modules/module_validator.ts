import {ContractBinding} from "../../interfaces/mortar";
import {JsonFragment} from "../types/abi"
import {cli} from "cli-ux";

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
        cli.info("Binding did not match number of arguments for contract - ", name)
        cli.info("  Expected ", String(ABI.inputs?.length || 0), " and got ", String(binding.args.length), " number of arguments.")
        cli.exit(0)
      }

      for (let i = 0; i < binding.args.length; i++) {
        switch (typeof binding.args[i]) {
          case "object": {
            if ("contract " + binding.args[i].name != ABI.inputs[i].internalType) {
              cli.info("Unsupported type for - ", binding.name, " \n provided: ", binding.args[i].name, "\n expected: ", ABI.inputs[i].internalType || "")
              cli.exit(0)
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
            cli.log("Unsupported type for - ", binding.name, " ", binding.args[i])
            cli.exit(0)
          }
        }
      }
    }
  }
}
