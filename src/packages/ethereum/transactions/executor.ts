import {
  AfterCompileEvent,
  AfterDeployEvent,
  AfterDeploymentEvent, BeforeCompileEvent, BeforeDeployEvent, BeforeDeploymentEvent,
  DeployedContractBinding, OnChangeEvent,
  StatefulEvent
} from "../../../interfaces/mortar";
import {Prompter} from "../../prompter";
import {ModuleStateRepo} from "../../modules/states/state_repo";
import {checkIfExist} from "../../utils/util";
import {EthTxGenerator} from "./generator";
import {BigNumber, providers} from "ethers";
import {defaultAbiCoder as abiCoder} from "@ethersproject/abi"
import {TransactionReceipt} from "@ethersproject/abstract-provider";
import {JsonFragmentType} from "../../types/abi";
import {cli} from "cli-ux";
import {EventHandler} from "../../modules/events/handler";
import {CliError, ContractTypeMismatch, ContractTypeUnsupported} from "../../types/errors";
import {ModuleState} from "../../modules/states/module";
import {IModuleRegistryResolver} from "../../modules/states/registry";

const CONSTRUCTOR_TYPE = 'constructor'
export const BLOCK_CONFIRMATION_NUMBER = 0

export class TxExecutor {
  private readonly networkId: number

  private prompter: Prompter
  private moduleState: ModuleStateRepo
  private txGenerator: EthTxGenerator
  private ethers: providers.JsonRpcProvider
  private eventHandler: EventHandler

  constructor(prompter: Prompter, moduleState: ModuleStateRepo, txGenerator: EthTxGenerator, networkId: number, ethers: providers.JsonRpcProvider, eventHandler: EventHandler) {
    this.prompter = prompter
    this.moduleState = moduleState
    this.txGenerator = txGenerator

    this.ethers = ethers
    this.eventHandler = eventHandler
    this.networkId = networkId
  }

  async execute(moduleName: string, moduleState: ModuleState, registry: IModuleRegistryResolver | null, resolver: IModuleRegistryResolver | null): Promise<void> {
    await this.moduleState.storeNewState(moduleName, moduleState)

    for (let [elementName, element] of Object.entries(moduleState)) {
      if (checkIfExist((element as DeployedContractBinding)?.bytecode)) {
        const contractAddress = await resolver?.resolveContract(this.networkId, moduleName, elementName)

        if (checkIfExist(element.txData.contractAddress)) {
          cli.info(elementName, "is already deployed")
          await this.prompter.promptContinueDeployment()
          continue
        }

        if (checkIfExist(contractAddress)) {
          element.txData.contractAddress = contractAddress as string
          await this.moduleState.storeSingleBinding(element as DeployedContractBinding)
          continue
        }

        const contractBinding = await this.executeSingleBinding(element as DeployedContractBinding, moduleState)
        if (checkIfExist(registry) && checkIfExist(contractBinding.txData.contractAddress)) {
          await registry?.setAddress(this.networkId, moduleName, contractBinding.name, <string>contractBinding.txData.contractAddress)
        }

        await this.moduleState.storeSingleBinding(contractBinding)
        continue
      }

      await this.executeEvent(moduleName, element as StatefulEvent, moduleState)
    }

    return
  }

  private async executeEvent(moduleName: string, event: StatefulEvent, moduleState: ModuleState): Promise<void> {

    switch (event.event.eventType) {
      case "BeforeDeployEvent": {
        await this.eventHandler.executeBeforeDeployEventHook(moduleName, event.event as BeforeDeployEvent, moduleState)
        break;
      }
      case "AfterDeployEvent": {
        await this.eventHandler.executeAfterDeployEventHook(moduleName, event.event as AfterDeployEvent, moduleState)
        break;
      }
      case "AfterDeploymentEvent": {
        await this.eventHandler.executeAfterDeploymentEventHook(moduleName, event.event as AfterDeploymentEvent, moduleState)
        break;
      }
      case "BeforeDeploymentEvent": {
        await this.eventHandler.executeBeforeDeploymentEventHook(moduleName, event.event as BeforeDeploymentEvent, moduleState)
        break;
      }
      case "BeforeCompileEvent": {
        await this.eventHandler.executeBeforeCompileEventHook(moduleName, event.event as BeforeCompileEvent, moduleState)
        break;
      }
      case "AfterCompileEvent": {
        await this.eventHandler.executeAfterCompileEventHook(moduleName, event.event as AfterCompileEvent, moduleState)
        break;
      }
      case "OnChangeEvent": {
        await this.eventHandler.executeOnChangeEventHook(moduleName, event.event as OnChangeEvent, moduleState)
        break;
      }
      default: {
        throw new CliError("Failed to match event type with user event hooks.")
      }
    }
  }

  private async executeSingleBinding(binding: DeployedContractBinding, moduleState: ModuleState): Promise<DeployedContractBinding> {
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
          if (binding.args[i]?._isBigNumber) {
            let value = binding.args[i].toString()

            values.push(value)
            types.push(constructorFragmentInputs[i].type)
            break
          }

          if (binding.args[i]?.type == 'BigNumber') {
            let value = BigNumber.from(binding.args[i].hex).toString()

            values.push(value)
            types.push(constructorFragmentInputs[i].type)
            break
          }

          if (binding.args[i].length > 0) {
            values.push(binding.args[i])
            types.push(constructorFragmentInputs[i].type)
            break
          }

          if ("contract " + binding.args[i].name != constructorFragmentInputs[i].internalType) {
            throw new ContractTypeMismatch(`Unsupported type for - ${binding.name} \n provided: ${binding.args[i].name} \n expected: ${constructorFragmentInputs[i].internalType || ""}`)
          }

          const dependencyName = binding.args[i].name
          const dependencyTxData = moduleState[dependencyName].txData
          if (!checkIfExist(dependencyTxData) || !checkIfExist(dependencyTxData.contractAddress)) {
            throw new ContractTypeMismatch(`Dependency contract not deployed \n Binding name: ${binding.name} \n Dependency name: ${binding.args[i].name}`)
          }

          if (!checkIfExist(dependencyTxData.contractAddress)) {
            throw new ContractTypeMismatch(`No contract address in dependency tree \n Binding name: ${binding.name} \n Dependency name: ${binding.args[i].name}`)
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
          if (constructorFragmentInputs[i].type == "bytes") {
            values.push(Buffer.from(binding.args[i]))
            types.push(constructorFragmentInputs[i].type)
            break
          }

          values.push(binding.args[i])
          types.push(constructorFragmentInputs[i].type)

          break
        }
        case "boolean": {
          values.push(binding.args[i])
          types.push(constructorFragmentInputs[i].type)


          break
        }
        default: {
          throw new ContractTypeUnsupported(`Unsupported type for - ${binding.name}  ${binding.args[i]}`)
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

  private async sendTransaction(name: string, signedTx: string): Promise<TransactionReceipt> {
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
