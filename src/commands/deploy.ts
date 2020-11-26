import {Command, flags} from '@oclif/command'
import * as path from "path";
import {ModuleBucketRepo} from "../packages/modules/bucket_repo";
import {ModuleResolver} from "../packages/modules/module_resolver";
import {checkIfExist} from "../packages/utils/util";
import {EthTxGenerator} from "../packages/ethereum/transactions/generator";
import ConfigService from "../packages/config/service";
import {Prompter} from "../packages/prompter";
import {TxExecutor} from "../packages/ethereum/transactions/executor";
import {GasCalculator} from "../packages/ethereum/gas/calculator";
import {ethers} from "ethers";
import {cli} from "cli-ux";
import * as command from "../index"

export default class Deploy extends Command {
  static description = 'Deploy new migrations, difference between current and already deployed.'

  static flags = {
    networkId: flags.integer(
      {
        name: 'network_id',
        description: 'Network ID of the network you are willing to deploy your contracts.',
        required: true
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: "Used for debugging purposes."
      }
    ),
    skipConfirmation: flags.boolean(
      {
        name: "skipConfirmation",
        description: "Used to skip confirmation questions."
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

    let prompter
    if (flags.skipConfirmation) {
      prompter = new Prompter(true)
    }

    const currentPath = process.cwd()
    const filePath = args.pathToFile as string
    if (filePath == "") {
      cli.info("Their is no mortar config, please run init first.\n   Use --help for more information.")
    }
    if (!checkIfExist(flags.networkId)) {
      cli.info("Network id flag not provided, please use --help")
      cli.exit(0)
    }

    const provider = new ethers.providers.JsonRpcProvider();

    const moduleResolver = new ModuleResolver()
    const moduleBucket = new ModuleBucketRepo(currentPath)
    const configService = new ConfigService(currentPath)
    const gasCalculator = new GasCalculator(provider)
    const txGenerator = await new EthTxGenerator(configService, gasCalculator, flags.networkId, provider)
    const txExecutor = new TxExecutor(prompter, moduleBucket, txGenerator, flags.networkId, provider)
    const migrationFilePath = path.resolve(currentPath, filePath)

    await command.deploy(migrationFilePath, moduleBucket, moduleResolver, txGenerator, prompter, txExecutor)

    cli.exit(0)
  }
}
