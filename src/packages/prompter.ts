import {DeployedContractBinding} from "../interfaces/mortar";
import cli from "cli-ux";
import {TransactionReceipt} from "@ethersproject/abstract-provider";

export class Prompter {
  constructor() {
  }

  // @TODO: move all prompting logic to here
  promptDeployerBindings(bindings: { [p: string]: DeployedContractBinding }): void {
    for (let [name, bind] of Object.entries(bindings)) {
      console.log("Contract name: ", name)
      console.log("   Tx Data: ")
      console.log("            Input", bind.txData.input?.input)
      console.log("            From", bind.txData.input?.from)
    }
  }

  async promptContinueDeployment(): Promise<void> {
    const con = await cli.prompt('Do you wish to continue with deployment of this migration? (Y/n)')
    if (con != 'n' && con != 'Y') {
      return await this.promptContinueDeployment()
    }

    if (con == 'n') {
      cli.exit()
    }
  }

  async promptExecuteTx(): Promise<void> {
    const con = await cli.prompt('Execute transactions? (Y/n)')
    if (con != 'n' && con != 'Y') {
      return await this.promptExecuteTx()
    }

    if (con == 'n') {
      cli.exit()
      process.exit()
    }
  }

  promptSignedTransaction(tx: string): void {
    cli.log(`Signed transaction: ${tx}`)
  }

  errorPrompt(error: Error): void {
    cli.error(error)
  }

  sendingTx(): void {
    cli.action.start("Sending tx")
  }

  sentTx(): void {
    cli.action.stop("sent")
  }

  transactionReceipt(): void {
    cli.log("Waiting for block confirmation...")
  }

  waitTransactionConfirmation(): void {
    cli.action.start("Block is mining")
  }

  transactionConfirmation(name: string, confirmationNumber: number): void {
    cli.action.stop(`\n ${name} - Current block confirmation: ${confirmationNumber}`)
  }
}
