import {CompiledContractBinding} from "../../interfaces/mortar";
import {checkIfExist} from "../utils/util"

export class ModuleResolver {
  constructor() {
  }

  checkIfDiff(oldBindings: { [p: string]: CompiledContractBinding }, newBindings: { [p: string]: CompiledContractBinding }): boolean {
    // @TODO(filip): be more specific about type of conflict. What fields needs to mismatch in order to consider this different
    if (JSON.stringify(oldBindings) == JSON.stringify(newBindings)) {
      return false
    }

    let oldBindingsLength = 0
    let newBindingsLength = 0
    if (checkIfExist(oldBindings)) {
      oldBindingsLength = Object.keys(oldBindings).length
    }
    if (checkIfExist(newBindings)) {
      newBindingsLength = Object.keys(newBindings).length
    }

    if (newBindingsLength != oldBindingsLength) {
      return true
    }

    let i = 0
    while (i < oldBindingsLength) {
      let oldBinding: CompiledContractBinding = oldBindings[Object.keys(oldBindings)[i]]
      let newBinding: CompiledContractBinding = newBindings[Object.keys(oldBindings)[i]]

      if (oldBinding.bytecode != newBinding.bytecode) {
        return true
      }

      i++
    }

    return false
  }

  printDiffParams(oldBindings: { [p: string]: CompiledContractBinding }, newBindings: { [p: string]: CompiledContractBinding }): void {
    if (!this.checkIfDiff(oldBindings, newBindings)) {
      return
    }

    let oldBindingsLength = 0
    let newBindingsLength = 0
    if (checkIfExist(oldBindings)) {
      oldBindingsLength = Object.keys(oldBindings).length
    }
    if (checkIfExist(newBindings)) {
      newBindingsLength = Object.keys(newBindings).length
    }
    if (newBindingsLength < oldBindingsLength) {
        console.log("current module is slimmer than already deployed one")
    }

    let i = 0
    while (i < oldBindingsLength) {
      let oldBinding = oldBindings[Object.keys(oldBindings)[i]]
      let newBinding = newBindings[Object.keys(oldBindings)[i]]

      if (oldBinding.bytecode != newBinding.bytecode) {
        console.log("~", newBinding.name)
        printArgs(newBinding.args, "  ");
      }

      i++
    }

    while (i < newBindingsLength) {
      let newBinding = newBindings[Object.keys(newBindings)[i]]

      console.log("+", newBinding.name)
      printArgs(newBinding.args, "  ");
      i++
    }

    return
  }
}

function printArgs(args: any[], indent: string): void {
  if (args.length != 0) {
    for (let arg of args) {
      // @TODO: make this prettier
      console.log(indent + "└── " + arg.name)
      return printArgs(arg.args, indent + "  ")
    }
  }

  return
}
