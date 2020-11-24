import {Command, flags} from '@oclif/command'
import ConfigService from "../packages/config/service";

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

    //@TODO(filip): add support for other signing ways (e.g. mnemonic, seed phrase, hd wallet, etc)
    const configService = new ConfigService(process.cwd())
    configService.generateAndSaveConfig(flags.privateKey as string)

    // @TODO: iterate over abi and generate TS interface
  }
}
