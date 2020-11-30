import {Command, flags} from '@oclif/command'
import * as path from "path";
import {cli} from "cli-ux";
import * as command from "../index";

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
    const {args, flags} = this.parse(Diff)
    if (flags.debug) {
      cli.config.outputLevel = "debug"
    }

    await command.diff(flags, args)
  }
}
