import {DeployedContractBinding, TransactionData} from "../../../interfaces/mortar";
import ConfigService from "../../config/service";
import Web3 from 'web3'

export class EthTxGenerator {
  private configService: ConfigService
  private web3: Web3

  constructor(configService: ConfigService) {
    this.configService = configService
    this.web3 = new Web3()
  }

  populateTx(bindings: { [p: string]: DeployedContractBinding }): { [p: string]: DeployedContractBinding } {
    let rawTxs: TransactionData[] = []

    for (let [name, bind] of Object.entries(bindings)) {

      let rawTx: TransactionData = {
        input: null,
        output: null,
      }

      // @TODO: enable multiple address to send tx
      const privateKey = this.configService.getPrivateKey()

      const accountAddr = this.web3.eth.accounts.privateKeyToAccount(privateKey).address
      rawTx.input = {
        from: accountAddr,
        input: bind.bytecode
      }

      // @TODO: enable tracking of tx in event hooks. inside bind we have instance function in which we can track all necessary data along
      rawTxs.push(rawTx)

      bindings[name].txData = rawTx
    }

    return bindings
  }
}
