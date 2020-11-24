import {DeployedContractBinding} from "../../../interfaces/mortar";
import {Prompter} from "../../prompter";
import {ModuleBucketRepo} from "../../modules/bucket_repo";
import {checkIfExist} from "../../utils/util";
import {EthTxGenerator} from "./generator";
import {providers} from "ethers";
import {defaultAbiCoder as abiCoder} from "@ethersproject/abi"
import {TransactionReceipt} from "@ethersproject/abstract-provider";
import {JsonFragmentType} from "../../types/abi";
import {cli} from "cli-ux";

const CONSTRUCTOR_TYPE = 'constructor'
const BLOCK_CONFIRMATION_NUMBER = 0

export class TxExecutor {
  private prompter: Prompter
  private moduleBucket: ModuleBucketRepo
  private txGenerator: EthTxGenerator
  private ethers: providers.JsonRpcProvider

  constructor(prompter: Prompter, moduleBucket: ModuleBucketRepo, txGenerator: EthTxGenerator, networkId: number, ethers: providers.JsonRpcProvider) {
    this.prompter = prompter
    this.moduleBucket = moduleBucket
    this.txGenerator = txGenerator


    this.ethers = ethers
  }

  async executeBindings(bindingName: string, bindings: { [p: string]: DeployedContractBinding }): Promise<void> {
    for (let [name, binding] of Object.entries(bindings)) {

      if (!checkIfExist(binding.txData.output)) {
        cli.info(name, " - deploying")
        bindings[name] = await this.executeSingleBinding(binding, bindings)
      }

      this.moduleBucket.storeNewBucket(bindings, false)
    }

    return
  }

  async executeSingleBinding(binding: DeployedContractBinding, bindings: { [p: string]: DeployedContractBinding }): Promise<DeployedContractBinding> {
    let constructorFragmentInputs = [] as JsonFragmentType[]

    for (let i = 0; i < binding.abi.length; i++) {
      const abi = binding.abi[i]

      if (abi.type == CONSTRUCTOR_TYPE && abi.inputs) {
        constructorFragmentInputs = abi.inputs
        break
      }
    }

    let bytecode: string = binding.bytecode
    const values: any[] = []
    const types: any[] = []

    for (let i = 0; i < constructorFragmentInputs?.length; i++) {
      switch (typeof binding.args[i]) {
        case "object": {
          if ("contract " + binding.args[i].name != constructorFragmentInputs[i].internalType) {
            cli.info("Unsupported type for - ", binding.name,
              " \n provided: ", binding.args[i].name,
              "\n expected: ", constructorFragmentInputs[i].internalType || "")
            cli.exit(0)
          }

          const dependencyName = binding.args[i].name
          const dependencyTxData = bindings[dependencyName].txData
          if (!checkIfExist(dependencyTxData) || !checkIfExist(dependencyTxData.output)) {
            cli.log("Dependency contract not deployed\n", "Binding name: ", binding.name, "\n Dependency name: ", binding.args[i].name)
            cli.exit(0)
          }

          if (dependencyTxData.output != null && !dependencyTxData.output.status) {
            cli.log("Dependency contract not included in the block \n", "Binding name: ", binding.name, "\n Dependency name: ", binding.args[i].name)
            cli.exit(0)
          }

          if (!checkIfExist(dependencyTxData.contractAddress)) {
            cli.log("No contract address in dependency tree \n", "Binding name: ", binding.name, "\n Dependency name: ", binding.args[i].name)
            cli.exit(0)
          }

          values.push(dependencyTxData.contractAddress)
          types.push(constructorFragmentInputs[i].type)

          break
        }
        case "number": {
          values.push(binding.args[i])
          types.push(constructorFragmentInputs[i].type)

          break
        }
        case "string": {
          values.push(binding.args[i])
          types.push(constructorFragmentInputs[i].type)

          break
        }
        case "boolean": {
          values.push(binding.args[i])
          types.push(constructorFragmentInputs[i].type)


          break
        } // @TODO: add support for big int and array buffer types, and any other that seem relevant
        default: {
          cli.log("Unsupported type for - ", binding.name, " ", binding.args[i])
          cli.exit(0)
        }
      }
    }

    bytecode = bytecode + abiCoder.encode(types, values).substring(2)

    const signedTx = await this.txGenerator.generateSingedTx(
      0,
      bytecode,
    )

    await this.prompter.promptSignedTransaction(signedTx)
    await this.prompter.promptExecuteTx()
    const txReceipt = await this.sendTransaction(binding.name, signedTx)

    binding.txData.contractAddress = txReceipt.contractAddress
    binding.txData.output = txReceipt

    return binding
  }

  async sendTransaction(name: string, signedTx: string): Promise<TransactionReceipt> {
    return new Promise(async (resolve) => {

      this.prompter.sendingTx()
      const txResp = await this.ethers.sendTransaction(signedTx)
      this.prompter.sentTx()
      const txReceipt = await txResp.wait(BLOCK_CONFIRMATION_NUMBER)
      this.prompter.transactionReceipt()
      this.prompter.waitTransactionConfirmation()
      this.prompter.transactionConfirmation(name, BLOCK_CONFIRMATION_NUMBER)

      resolve(txReceipt)
      return txReceipt
    })
  }
}
