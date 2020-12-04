import {CompiledContractBinding, DeployedContractBinding, TransactionData} from "../../interfaces/mortar";
import {checkIfExist} from "../utils/util"
import {cli} from "cli-ux";
import {ethers} from "ethers";
import {Prompter} from "../prompter";
import {EthTxGenerator} from "../ethereum/transactions/generator";

export class ModuleResolver {
  private readonly signer: ethers.Wallet;
  private readonly prompter: Prompter;
  private readonly txGenerator: EthTxGenerator;

  constructor(provider: ethers.providers.JsonRpcProvider, privateKey: string, prompter: Prompter, txGenerator: EthTxGenerator) {
    this.signer = new ethers.Wallet(privateKey, provider)
    this.prompter = prompter
    this.txGenerator = txGenerator
  }

  checkIfDiff(oldBindings: { [p: string]: CompiledContractBinding }, newBindings: { [p: string]: CompiledContractBinding }): boolean {
    // @TODO(filip): be more specific about type of conflict. What fields needs to mismatch in order to consider this different
    // if args match also

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
      const oldBinding: CompiledContractBinding = oldBindings[Object.keys(oldBindings)[i]]
      const newBinding: CompiledContractBinding = newBindings[Object.keys(oldBindings)[i]]

      if (oldBinding.bytecode != newBinding.bytecode) {
        return true
      }

      if (!checkArgs(oldBinding.args, newBinding.args)) {
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
      cli.info("Currently deployed module is bigger than current module.")
      cli.exit(0)
    }

    let i = 0
    while (i < oldBindingsLength) {
      let oldBinding = oldBindings[Object.keys(oldBindings)[i]]
      let newBinding = newBindings[Object.keys(oldBindings)[i]]

      if (oldBinding.bytecode != newBinding.bytecode) {
        cli.info("~", newBinding.name)
        printArgs(newBinding.args, "  ");
      }

      i++
    }

    while (i < newBindingsLength) {
      let newBinding = newBindings[Object.keys(newBindings)[i]]

      cli.info("+", newBinding.name)
      printArgs(newBinding.args, "  ");
      i++
    }

    return
  }

  resolve(
    currentBindings: { [p: string]: CompiledContractBinding },
    deployedBindings: { [p: string]: DeployedContractBinding }
  ): { [p: string]: DeployedContractBinding } | null {
    let currentBindingsLength = 0
    let deployedBindingsLength = 0
    if (checkIfExist(currentBindings)) {
      currentBindingsLength = Object.keys(currentBindings).length
    }
    if (checkIfExist(deployedBindings)) {
      deployedBindingsLength = Object.keys(deployedBindings).length
    }

    if (currentBindingsLength < deployedBindingsLength) {
      throw new StateIsBiggerThanModule("Current module state files has more bindings than current one.")
    }

    let resolvedBindings: { [p: string]: DeployedContractBinding } = {}
    let i = 0
    while (i < deployedBindingsLength) {
      let bindingName = Object.keys(deployedBindings)[i]
      let deployedBinding = deployedBindings[bindingName]
      let currentBinding = currentBindings[bindingName]

      resolvedBindings[bindingName] = new DeployedContractBinding(
        // contract metadata
        deployedBinding.name,
        deployedBinding.args,
        deployedBinding.bytecode,
        deployedBinding.abi,
        deployedBinding.txData,

        currentBinding.events,
        this.signer,
        this.prompter,
        this.txGenerator
      )

      // @TODO: is there more cases where we want to redeploy bindings
      if (deployedBinding.bytecode != currentBinding.bytecode) {
        resolvedBindings[bindingName] = new DeployedContractBinding(
          // current metadata
          currentBinding.name,
          currentBinding.args,
          currentBinding.bytecode,
          currentBinding.abi,
          {} as TransactionData,

          // event hooks
          currentBinding.events,
          this.signer,
          this.prompter,
          this.txGenerator
        )
      }

      i++
    }

    while (i < currentBindingsLength) {
      let bindingName = Object.keys(currentBindings)[i]
      let currentBinding = currentBindings[bindingName]

      resolvedBindings[bindingName] = new DeployedContractBinding(
        // current metadata
        currentBinding.name,
        currentBinding.args,
        currentBinding.bytecode,
        currentBinding.abi,
        {} as TransactionData,

        currentBinding.events,
        this.signer,
        this.prompter,
        this.txGenerator
      )
      i++
    }

    return resolvedBindings
  }
}

function printArgs(args: any[], indent: string): void {
  if (args.length != 0) {
    for (let arg of args) {
      // @TODO: make this prettier
      if (checkIfExist(arg.name)) {
        cli.info(indent + "└── " + arg.name)
        return printArgs(arg.args, indent + "  ")
      }
    }
  }

  return
}

function checkArgs(currentArgs: any[], deployedArgs: any[]): boolean {
  let currentArgsLen = currentArgs.length
  let deployedArgsLen = deployedArgs.length

  if (currentArgsLen != deployedArgsLen) {
    return false
  }

  let i = 0;
  while (i < currentArgsLen) {

    if (currentArgs[i] != deployedArgs[i]) {
      return false
    }

    if (
      checkIfExist(currentArgs[i].args) &&
      checkIfExist(deployedArgs[i].args) &&
      !checkArgs(currentArgs[i].args, deployedArgs[i].args)
    ) {
      return false
    }

    i++
  }

  return true
}

