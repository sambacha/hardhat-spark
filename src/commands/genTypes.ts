import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import { PathNotProvided } from '../packages/types/errors';
import path from 'path';
import { ModuleTypings } from '../packages/modules/typings';
import * as command from '../index';

export default class GenTypes extends Command {
  static description = 'describe the command here';

  static flags = {
    help: flags.help({char: 'h'}),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Flag used for debugging'
      }
    )
  };

  static args = [{name: 'path'}];

  async run() {
    const {args, flags} = this.parse(GenTypes);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    const currentPath = process.cwd();
    const filePath = args.path as string;
    if (filePath == '') {
      throw new PathNotProvided('Path argument missing from command. \nPlease use --help to better understand usage of this command');
    }

    const resolvedPath = path.resolve(currentPath, filePath);
    const typings = new ModuleTypings(currentPath);

    await command.genTypes(resolvedPath, typings);
  }
}
