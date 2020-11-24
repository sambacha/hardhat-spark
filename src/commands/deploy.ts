import {Command, flags} from '@oclif/command'
import * as path from "path";
import {ModuleBucketRepo} from "../packages/modules/bucket_repo";
import {ModuleResolver} from "../packages/modules/module_resolver";
import {DeployedContractBinding, Module} from "../interfaces/mortar";
import {checkIfExist} from "../packages/utils/util";
import {EthTxGenerator} from "../packages/ethereum/transactions/generator";
import ConfigService from "../packages/config/service";
import {Prompter} from "../packages/prompter";
import {TxExecutor} from "../packages/ethereum/transactions/executor";
import {GasCalculator} from "../packages/ethereum/gas/calculator";
import {ethers} from "ethers";
import {cli, Levels} from "cli-ux";

export default class Deploy extends Command {
  static description = 'Deploy new migrations, difference between current and already deployed.'

  static flags = {
    networkId: flags.integer(
      {
        name: 'network_id',
        description: 'Network ID of the network you are willing to deploy your contracts',
        required: true
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: "Flag used for debugging"
      }
    ),
    help: flags.help({char: 'h'}),
  }

  static args = [{name: 'pathToFile'}]

  async run() {
    const {args, flags} = this.parse(Deploy)
    if (flags.debug) {
      cli.config.outputLevel = "debug"
    }

    const currentPath = process.cwd()
    const filePath = args.pathToFile as string
    if (filePath == "") {
      console.log("no file path")
    }
    if (!checkIfExist(flags.networkId)) {
      console.log("Network id flag not provided, please use --help")
      process.exit(0)
    }

    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");

    const moduleResolver = new ModuleResolver()
    const moduleBucket = new ModuleBucketRepo(currentPath)
    const configService = new ConfigService(currentPath)
    const gasCalculator = new GasCalculator(provider)
    const txGenerator = await new EthTxGenerator(configService, gasCalculator, flags.networkId, provider)
    const prompter = new Prompter()
    const txExecutor = new TxExecutor(prompter, moduleBucket, txGenerator, flags.networkId, provider)

    const modules = require(path.resolve(currentPath, filePath))
    for (let [moduleName, module] of Object.entries(modules)) {
      cli.info("\nDeploying module - ", moduleName)
      let deployedBucket = moduleBucket.getBucket()
      if (deployedBucket == null) {
        deployedBucket = {}
      }

      const resolvedBindings: { [p: string]: DeployedContractBinding } | null = moduleResolver.resolve((module as Module).getAllBindings(), deployedBucket)
      if (!checkIfExist(resolvedBindings)) {
        cli.info("Nothing to deploy")
        process.exit(0)
      }

      const bindings = txGenerator.populateTx(resolvedBindings as { [p: string]: DeployedContractBinding })
      prompter.promptDeployerBindings(bindings)

      await prompter.promptContinueDeployment()
      await txExecutor.executeBindings(moduleName, bindings)
    }

    process.exit(0)
  }
}
