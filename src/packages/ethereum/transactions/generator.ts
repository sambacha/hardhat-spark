import {DeployedContractBinding, TransactionData} from "../../../interfaces/mortar";
import ConfigService from "../../config/service";
import {GasCalculator} from "../gas/calculator";
import {checkIfExist} from "../../utils/util";
import {Wallet, providers} from "ethers"
import {TransactionRequest} from "@ethersproject/abstract-provider"

export class EthTxGenerator {
  private configService: ConfigService
  private gasCalculator: GasCalculator
  private ethers: providers.JsonRpcProvider
  private readonly wallet: Wallet
  private readonly networkId: number


  constructor(configService: ConfigService, gasCalculator: GasCalculator, networkId: number, ethers: providers.JsonRpcProvider) {
    this.configService = configService
    this.ethers = ethers

    this.wallet = new Wallet(this.configService.getPrivateKey(), this.ethers)
    this.gasCalculator = gasCalculator
    this.networkId = networkId
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

  async generateSingedTx(value: number, data: string): Promise<string> {
    const gas = await this.gasCalculator.estimateGas(this.wallet.address, null, data)

    const tx: TransactionRequest = {
      from: this.wallet.address,
      value: value,
      gasPrice: await this.gasCalculator.getCurrentPrice(),
      gasLimit: gas,
      data: data,
      nonce: await this.wallet.getTransactionCount(),
      chainId: this.networkId
    }

    return this.wallet.signTransaction(tx)
  }
}
