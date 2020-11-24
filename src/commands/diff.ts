import {Command, flags} from '@oclif/command'
import * as path from "path";
import {cli} from "cli-ux";

export default class Diff extends Command {
  static description = 'Difference between deployed and current migrations.'

  static flags = {
    help: flags.help({char: 'h'}),
    debug: flags.boolean(
      {
        name: 'debug',
        description: "Flag used for debugging"
      }
    )
  }

  static args = [{name: 'path'}]

  async run() {
    const {args} = this.parse(Diff)
    let currentPath = process.cwd()
    let filePath = args.path as string
    if (filePath == "") {
      cli.info("Path argument missing from command. \nPlease use --help to better understand usage of this command")
    }

    require(path.resolve(currentPath, filePath))
  }
}
