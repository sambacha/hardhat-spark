import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import * as command from '../index';
import { errorHandling } from '../index';
import { ModulePackagingService } from '../services/modules/module_packaging';

export default class Package extends Command {
  static description = '';

  static flags = {
    help: flags.help({char: 'h'}),
    name: flags.string(
      {
        name: 'name',
        description: 'Here you specify package name for your name. In case of npm this name should be used when package is being installed.',
        required: true,
      }
    ),
    version: flags.string(
      {
        name: 'version',
        description: 'Package version e.g. v0.1.0',
        required: true,
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Flag used for debugging'
      }
    )
  };

  async run() {
    const {args, flags} = this.parse(Package);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
      process.env.DEBUG = '*';
    }

    // @TODO(filip): write what is the job of this service.

    const modulePackagingService = new ModulePackagingService(flags.name, flags.version);

    await command.createPackage(modulePackagingService);
  }

  async catch(error: Error) {
    await errorHandling.bind(this)(error);
  }
}
