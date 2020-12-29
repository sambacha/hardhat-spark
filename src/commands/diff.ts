import { Command, flags } from '@oclif/command';
import * as path from 'path';
import { cli } from 'cli-ux';
import * as command from '../index';
import { ModuleResolver } from '../packages/modules/module_resolver';
import { checkIfExist } from '../packages/utils/util';
import { ethers } from 'ethers';
import ConfigService from '../packages/config/service';
import { Prompter } from '../packages/prompter';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import { GasCalculator } from '../packages/ethereum/gas/calculator';
import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { NetworkIdNotProvided, PathNotProvided, UserError } from '../packages/types/errors';

export default class Diff extends Command {
  static description = 'Difference between deployed and current migrations.';

  static flags = {
    help: flags.help({char: 'h'}),
    networkId: flags.integer(
      {
        name: 'network_id',
        description: 'Network ID of the network you are willing to deploy your contracts.',
        required: true
      }
    ),
    debug: flags.boolean(
      {
        name: 'debug',
        description: 'Flag used for debugging'
      }
    ),
    state: flags.string(
      {
        name: 'state',
        description: 'Provide name of module\'s that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other.',
      }
    )
  };

  static args = [{name: 'path'}];

  async run() {
    const {args, flags} = this.parse(Diff);
    if (flags.debug) {
      cli.config.outputLevel = 'debug';
    }

    const currentPath = process.cwd();
    const filePath = args.path as string;
    if (filePath == '') {
      throw new PathNotProvided('Path argument missing from command. \nPlease use --help to better understand usage of this command');
    }
    if (!checkIfExist(flags.networkId)) {
      throw new NetworkIdNotProvided('Network id flag not provided, please use --help');
    }
    process.env.MORTAR_NETWORK_ID = String(flags.networkId);
    const states: string[] = flags.state?.split(',') || [];

    const resolvedPath = path.resolve(currentPath, filePath);

    const provider = new ethers.providers.JsonRpcProvider(); // @TODO: change this to fetch from config
    const configService = new ConfigService(currentPath);

    const gasCalculator = new GasCalculator(provider);
    const txGenerator = await new EthTxGenerator(configService, gasCalculator, flags.networkId, provider);
    const prompter = new Prompter();

    const moduleStateRepo = new ModuleStateRepo(flags.networkId, currentPath);
    const moduleResolver = new ModuleResolver(provider, configService.getPrivateKey(), prompter, txGenerator, moduleStateRepo);

    await command.diff(resolvedPath, states, moduleResolver, moduleStateRepo);
  }

  async catch(error: Error) {
    if (error instanceof UserError) {
      cli.info(error.message);
      cli.exit(0);
    }

    cli.info(error.message);
    cli.info('If above error is not something that you expect, please open GitHub issue with detailed description what happened to you. issue_page_link ');
    cli.exit(1);
  }
}
