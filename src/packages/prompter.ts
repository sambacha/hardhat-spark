import {DeployedContractBinding} from "../interfaces/mortar";
import cli from "cli-ux";

export class Prompter {
  private readonly skipConfirmation: boolean

  constructor(skipConfirmation: boolean) {
    this.skipConfirmation = skipConfirmation
  }

  promptDeployerBindings(bindings: { [p: string]: DeployedContractBinding }): void {
    for (let [name, bind] of Object.entries(bindings)) {
      cli.debug("Contract name: ", name)
      cli.debug("   Tx Data: ")
      cli.debug("            Input", bind.txData.input?.input || "")
      cli.debug("            From", bind.txData.input?.from || "")
    }
  }

  async promptContinueDeployment(): Promise<void> {
    if (this.skipConfirmation) {
      return
    }

    const con = await cli.prompt('Do you wish to continue with deployment of this module? (Y/n)')
    if (con != 'n' && con != 'Y') {
      return await this.promptContinueDeployment()
    }

    if (con == 'n') {
      cli.exit()
    }
  }

  async promptContinueToNextBinding(): Promise<void> {
    if (this.skipConfirmation) {
      return
    }

    const con = await cli.prompt('Do you wish to continue to the next binding? (Y/n)')
    if (con != 'n' && con != 'Y') {
      return await this.promptContinueDeployment()
    }

    if (con == 'n') {
      cli.exit()
    }
  }

  async promptExecuteTx(): Promise<void> {
    if (this.skipConfirmation) {
      return
    }

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
    cli.debug(`Signed transaction: ${tx}`)
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
    cli.info("Waiting for block confirmation...")
  }

  waitTransactionConfirmation(): void {
    cli.action.start("Block is mining")
  }

  transactionConfirmation(name: string, confirmationNumber: number): void {
    cli.action.stop(`\n Current block confirmation: ${confirmationNumber}`)
  }
}
