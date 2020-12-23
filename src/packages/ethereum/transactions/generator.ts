import {CompiledContractBinding, DeployedContractBinding, TransactionData} from "../../../interfaces/mortar";
import ConfigService from "../../config/service";
import {GasCalculator} from "../gas/calculator";
import {checkIfExist} from "../../utils/util";
import {Wallet, providers, BigNumber} from "ethers"
import {TransactionRequest} from "@ethersproject/abstract-provider"
import {ModuleState} from "../../modules/states/module";
import {SingleContractLinkReference} from "../../types/artifacts/libraries";
import {CliError} from "../../types/errors";

export type TxMetaData = {
  gasPrice?: BigNumber;
  nonce?: number
}

export class EthTxGenerator {
  private configService: ConfigService
  private gasCalculator: GasCalculator
  private readonly ethers: providers.JsonRpcProvider
  private readonly wallet: Wallet
  private readonly networkId: number
  private nonceMap: { [address: string]: number }

  constructor(configService: ConfigService, gasCalculator: GasCalculator, networkId: number, ethers: providers.JsonRpcProvider) {
    this.configService = configService
    this.ethers = ethers

    this.wallet = new Wallet(this.configService.getPrivateKey(), this.ethers)
    this.gasCalculator = gasCalculator
    this.networkId = networkId
    this.nonceMap = {}
  }

  initTx(moduleState: ModuleState): ModuleState {
    for (let [stateElementName, stateElement] of Object.entries(moduleState)) {
      if (stateElement instanceof DeployedContractBinding) {
        if (checkIfExist(moduleState[stateElementName]?.txData)) {
          continue
        }

        let rawTx: TransactionData = {
          input: null,
          output: null,
        }

        // @TODO: enable multiple address to send tx. HD wallet, address array
        rawTx.input = {
          from: this.wallet.address,
          input: stateElement.bytecode
        }

        moduleState[stateElementName].txData = rawTx
      }
    }

    return moduleState
  }

  async getTransactionCount(walletAddress: string): Promise<number> {
    if (!checkIfExist((this.nonceMap)[walletAddress])) {
      (this.nonceMap)[walletAddress] = await this.ethers.getTransactionCount(walletAddress)
      return (this.nonceMap)[walletAddress]++
    }

    // @TODO: what nonce has increased in the mean time? (other tx, other deployment, etc.)
    return (this.nonceMap)[walletAddress]++
  }

  async generateSingedTx(value: number, data: string): Promise<string> {
    const gas = await this.gasCalculator.estimateGas(this.wallet.address, null, data)

    const tx: TransactionRequest = {
      from: this.wallet.address,
      value: value,
      gasPrice: await this.gasCalculator.getCurrentPrice(),
      gasLimit: gas,
      data: data,
      nonce: await this.getTransactionCount(await this.wallet.getAddress()),
      chainId: this.networkId
    }

    return this.wallet.signTransaction(tx)
  }

  addLibraryAddresses(bytecode: string, binding: CompiledContractBinding, moduleState: ModuleState): string {
    const libraries: SingleContractLinkReference = binding.libraries

    for (let [libraryName, libraryOccurrences] of Object.entries(libraries)) {
      const contractAddress = moduleState[libraryName].txData?.contractAddress as string
      if (!checkIfExist(contractAddress)) {
        throw new CliError(`Library is not deployed - ${libraryName}`)
      }

      for (let occurrence of libraryOccurrences) {
        const start = (occurrence.start + 1) * 2
        const length = occurrence.length * 2

        const firstPart = bytecode.slice(0, start)
        const secondPart = bytecode.slice(start + length)

        bytecode = firstPart.concat(contractAddress.substring(2), secondPart)
      }
    }

    return bytecode
  }

  async fetchTxData(walletAddress: string): Promise<TxMetaData> {
    return {
      gasPrice: await this.gasCalculator.getCurrentPrice(),
      nonce: await this.getTransactionCount(walletAddress),
    }
  }
}
