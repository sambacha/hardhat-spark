import {Command, flags} from '@oclif/command'
import ConfigService from "../packages/config/service";
import {cli} from "cli-ux";
import * as command from "../index";
import {UserError} from "../packages/types/errors";

export default class Init extends Command {
  static description = 'Initialize mortar configuration file'

  static flags = {
    help: flags.help({char: 'h'}),
    networkId: flags.integer(
      {
        name: 'network_id',
        description: 'Network ID of the network you are willing to deploy your contracts',
        required: true
      }
    ),
    privateKey: flags.string(
      {
        name: 'private_key',
        description: 'Private Key of the deployer account',
        required: true
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: "Flag used for debugging"
      }
    )
  }


  async run() {
    const {flags} = this.parse(Init)
    if (flags.debug) {
      cli.config.outputLevel = "debug"
    }

    const configService = new ConfigService(process.cwd())

    command.init(flags, configService)
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
