import {DeployedContractBinding} from "../../../interfaces/mortar";
import {Prompter} from "../../prompter";
import {ModuleBucketRepo} from "../../modules/bucket_repo";

export class TxExecutor {
  private prompter: Prompter
  private moduleBucket: ModuleBucketRepo

  constructor(prompter: Prompter, moduleBucket: ModuleBucketRepo) {
    this.prompter = prompter
    this.moduleBucket = moduleBucket
  }

  async executeBindings(bindings: { [p: string]: DeployedContractBinding }): Promise<void> {
    // @TODO: more carefully execute tx with
    // Execute TX, wait for it to be mined and wait 2 block for confirmation
    // log everything in the mean time
    this.moduleBucket.storeNewBucket(bindings, false)

    for (let [name, bind] of Object.entries(bindings)) {

      // @TODO: tx execution... step by step
    }

    // moduleBucket.storeNewBucket(currentBucket, false)
  }
}
