import {Command, flags} from '@oclif/command'
import * as path from "path";
import {ModuleBucketRepo} from "../packages/modules/bucket_repo";
import {ModuleResolver} from "../packages/modules/module_resolver";
import {DeployedContractBinding} from "../interfaces/mortar";
import {checkIfExist} from "../packages/utils/util";
import {EthTxGenerator} from "../packages/ethereum/transactions/generator";
import ConfigService from "../packages/config/service";
import {Prompter} from "../packages/prompter";
import cli from 'cli-ux'
import {TxExecutor} from "../packages/ethereum/transactions/executor";

export default class Deploy extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  static args = [{name: 'pathToFile'}]

  async run() {
    const {args} = this.parse(Deploy)
    const currentPath = process.cwd()
    const filePath = args.pathToFile as string
    if (filePath == "") {
      console.log("no file path")
    }

    const moduleResolver = new ModuleResolver()
    const moduleBucket = new ModuleBucketRepo(currentPath)
    const configService = new ConfigService(currentPath)
    const txGenerator = new EthTxGenerator(configService)
    const prompter = new Prompter()
    const txExecutor = new TxExecutor(prompter, moduleBucket)


    const module = require(path.resolve(currentPath, filePath))

    let currentBucket = moduleBucket.getCurrentBucket()
    if (currentBucket == null) {
      currentBucket = {}
    }

    let deployedBucket = moduleBucket.getBucket()
    if (deployedBucket == null) {
      deployedBucket = {}
    }

    // initiate deploy procedure
    console.log("\n\n\n\n")

    const resolvedBindings: { [p: string]: DeployedContractBinding } | null = moduleResolver.resolve(currentBucket, deployedBucket)
    if (!checkIfExist(resolvedBindings)) {
      console.log("Nothing to deploy")
      process.exit(0)
    }

    let bindings = txGenerator.populateTx(resolvedBindings as { [p: string]: DeployedContractBinding })
    prompter.promptDeployerBindings(bindings)

    const con = await prompter.promptContinueDeployment()
    if (!con) {
      process.exit(0)
    }

    await txExecutor.executeBindings(bindings)
  }
}
