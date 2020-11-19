import {Command, flags} from '@oclif/command'
import * as path from "path";

export default class Diff extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  static args = [{name: 'pathToFile'}]

  async run() {
    const {args} = this.parse(Diff)
    let currentPath = process.cwd()
    let filePath = args.pathToFile as string
    if (filePath == "") {
      console.log("no file path")
    }

    require(path.resolve(currentPath, filePath))
  }
}
