import {Command, flags} from '@oclif/command'
import * as path from "path";
import {ModuleBucketRepo} from "../packages/modules/bucket_repo";

export default class Deploy extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  static args = [{name: 'pathToFile'}]

  async run() {
    const {args} = this.parse(Deploy)
    let currentPath = process.cwd()
    let filePath = args.pathToFile as string
    if (filePath == "") {
      console.log("no file path")
    }

    require(path.resolve(currentPath, filePath))
    // add logic to continue with deployment
    const moduleBucket = new ModuleBucketRepo(currentPath)
    const currentBucket = moduleBucket.getCurrentBucket()

    // initiate deploy procedure

    moduleBucket.storeNewBucket(currentBucket, false)
  }
}
