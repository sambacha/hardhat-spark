import {Command, flags} from '@oclif/command'
import * as path from "path";
import {cli} from "cli-ux";
import * as command from "../index";
import {ModuleResolver} from "../packages/modules/module_resolver";
import {checkIfExist} from "../packages/utils/util";
import {ethers} from "ethers";
import ConfigService from "../packages/config/service";
import {Prompter} from "../packages/prompter";
import {EthTxGenerator} from "../packages/ethereum/transactions/generator";
import {GasCalculator} from "../packages/ethereum/gas/calculator";
import {ModuleStateRepo} from "../packages/modules/state_repo";

export default class Diff extends Command {
  static description = 'Difference between deployed and current migrations.'

  static flags = {
    help: flags.help({char: 'h'}),
    debug: flags.boolean(
      {
        name: 'debug',
        description: "Flag used for debugging"
      }
    ),
    networkId: flags.integer(
      {
        name: 'network_id',
        description: 'Network ID of the network you are willing to deploy your contracts.',
        required: true
      }
    )
  }

  static args = [{name: 'path'}]

  async run() {
    const {args, flags} = this.parse(Diff)
    if (flags.debug) {
      cli.config.outputLevel = "debug"
    }

    const currentPath = process.cwd()
    const filePath = args.path as string
    if (filePath == "") {
      cli.info("Path argument missing from command. \nPlease use --help to better understand usage of this command")
    }
    if (!checkIfExist(flags.networkId)) {
      cli.info("Network id flag not provided, please use --help")
      cli.exit(0)
    }
    process.env.MORTAR_NETWORK_ID = String(flags.networkId)

    const resolvedPath = path.resolve(currentPath, filePath)

    const provider = new ethers.providers.JsonRpcProvider(); // @TODO: change this to fetch from config
    const configService = new ConfigService(currentPath)

    const gasCalculator = new GasCalculator(provider)
    const txGenerator = await new EthTxGenerator(configService, gasCalculator, flags.networkId, provider)
    const prompter = new Prompter()

    const moduleResolver = new ModuleResolver(provider, configService.getPrivateKey(), prompter, txGenerator)
    const moduleState = new ModuleStateRepo(flags.networkId, currentPath, moduleResolver)

    await command.diff(resolvedPath, moduleResolver, moduleState)
  }
}
