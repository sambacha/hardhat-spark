import {DeployedContractBinding} from "../interfaces/mortar";
import cli from "cli-ux";

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

  async promptContinueDeployment(): Promise<boolean> {
    const con = await cli.prompt('Do you which to continue with deployment of above transactions? (Y/n)')
    if (con != 'n' && con != 'Y') {
      return await this.promptContinueDeployment()
    }

    if (con == 'n') {
      return false
    }

    return true
  }
}
