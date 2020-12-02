import {DeployedContractBinding, TransactionData} from "../../../interfaces/mortar";
import ConfigService from "../../config/service";
import {GasCalculator} from "../gas/calculator";
import {checkIfExist} from "../../utils/util";
import {Wallet, providers, BigNumber} from "ethers"
import {TransactionRequest} from "@ethersproject/abstract-provider"

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
  private nonceMap: {[address: string]: number}

  constructor(configService: ConfigService, gasCalculator: GasCalculator, networkId: number, ethers: providers.JsonRpcProvider) {
    this.configService = configService
    this.ethers = ethers

    this.wallet = new Wallet(this.configService.getPrivateKey(), this.ethers)
    this.gasCalculator = gasCalculator
    this.networkId = networkId
    this.nonceMap = {}
  }

  initTx(bindings: { [p: string]: DeployedContractBinding }): { [p: string]: DeployedContractBinding } {
    let rawTxs: TransactionData[] = []

    for (let [name, bind] of Object.entries(bindings)) {
      if (checkIfExist(bindings[name].txData.output)) {
        continue
      }

      let rawTx: TransactionData = {
        input: null,
        output: null,
      }

      // @TODO: enable multiple address to send tx. HD wallet, address array
      rawTx.input = {
        from: this.wallet.address,
        input: bind.bytecode
      }

      // @TODO: enable tracking of tx in event hooks. inside contract we have instance function in which we can track all necessary data along the way
      rawTxs.push(rawTx)

      bindings[name].txData = rawTx
    }

    return bindings
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

  async fetchTxData(walletAddress: string): Promise<TxMetaData> {
    return {
      gasPrice: await this.gasCalculator.getCurrentPrice(),
      nonce: await this.getTransactionCount(walletAddress),
    }
  }
}
