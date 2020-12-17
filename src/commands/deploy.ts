import {Command, flags} from '@oclif/command'
import * as path from "path";
import {ModuleStateRepo} from "../packages/modules/states/state_repo";
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
import {EventHandler} from "../packages/modules/events/handler";
import {UserError} from "../packages/types/errors";

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
    rpcProvider: flags.string(
      {
        name: 'rpc_provider',
        description: 'RPC Provider - URL of open RPC interface for your ethereum node.',
        required: false
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
    state: flags.string(
      {
        name: 'state',
        description: 'Provide name of module\'s that you would want to use as state. Most commonly used if you are deploying more than one module that are dependant on each other.',
      }
    ),
    help: flags.help({char: 'h'}),
  }

  static args = [{name: 'path'}]

  async run() {
    const {args, flags} = this.parse(Deploy)
    if (flags.debug) {
      cli.config.outputLevel = "debug"
    }

    const currentPath = process.cwd()
    const filePath = args.path as string
    if (filePath == "") {
      cli.info("Their is no mortar config, please run init first.\n   Use --help for more information.")
    }
    if (!checkIfExist(flags.networkId)) {
      cli.info("Network id flag not provided, please use --help")
      cli.exit(0)
    }
    process.env.MORTAR_NETWORK_ID = String(flags.networkId)
    const states: string[] = flags.state?.split(",") || []

    let provider = new ethers.providers.JsonRpcProvider()
    if (checkIfExist(flags.rpcProvider)) {
      provider = new ethers.providers.JsonRpcProvider(flags.rpcProvider);
    }

    let prompter = new Prompter(false)
    if (flags.skipConfirmation) {
      prompter = new Prompter(true)
    }
    const configService = new ConfigService(currentPath)

    const gasCalculator = new GasCalculator(provider)
    const txGenerator = await new EthTxGenerator(configService, gasCalculator, flags.networkId, provider)

    const moduleState = new ModuleStateRepo(flags.networkId, currentPath)
    const moduleResolver = new ModuleResolver(provider, configService.getPrivateKey(), prompter, txGenerator, moduleState)

    const eventHandler = new EventHandler(moduleState)
    const txExecutor = new TxExecutor(prompter, moduleState, txGenerator, flags.networkId, provider, eventHandler)

    const migrationFilePath = path.resolve(currentPath, filePath)

    await command.deploy(migrationFilePath, states, moduleState, moduleResolver, txGenerator, prompter, txExecutor)

    cli.exit(0)
  }

  async catch(error: Error) {
    if (error instanceof UserError) {
      cli.info(error.message)
      cli.exit(0)
    }

    cli.error(error)
    cli.info("If above error is not something that you expect, please open GitHub issue with detailed description what happened to you. issue_page_link ")
    cli.exit(1)
  }
}
