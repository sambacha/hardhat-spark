// export {run} from '@oclif/command'

import { cli } from 'cli-ux';
import ConfigService from './packages/config/service';
import { OutputFlags } from '@oclif/parser/lib/parse';
import { DeployedContractBinding, Module } from './interfaces/mortar';
import { checkIfExist } from './packages/utils/util';
import { ModuleStateRepo } from './packages/modules/states/state_repo';
import { ModuleResolver } from './packages/modules/module_resolver';
import { EthTxGenerator } from './packages/ethereum/transactions/generator';
import { Prompter } from './packages/prompter';
import { TxExecutor } from './packages/ethereum/transactions/executor';
import { StateResolver } from './packages/modules/states/state_resolver';
import { ModuleState } from './packages/modules/states/module';

export function init(flags: OutputFlags<any>, configService: ConfigService) {
  // @TODO(filip): add support for other signing ways (e.g. mnemonic, seed phrase, hd wallet, etc)
  configService.generateAndSaveConfig(flags.privateKey as string);

  cli.info('You have successfully configured mortar.');
}

export async function deploy(
  migrationFilePath: string,
  states: string[],
  moduleStateRepo: ModuleStateRepo,
  moduleResolver: ModuleResolver,
  txGenerator: EthTxGenerator,
  prompter: Prompter,
  executor: TxExecutor
) {
  const modules = await require(migrationFilePath);

  for (const [moduleName, moduleFunc] of Object.entries(modules)) {
    const module = (await moduleFunc) as Module;
    moduleStateRepo.initStateRepo(moduleName);

    let stateFileRegistry = await moduleStateRepo.getStateIfExist(moduleName);
    for (const moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName);

      stateFileRegistry = StateResolver.mergeStates(stateFileRegistry, moduleState);
    }

    const moduleState: ModuleState | null = moduleResolver.resolve(module.getAllBindings(), module.getAllEvents(), module.getAllModuleEvents(), stateFileRegistry);
    cli.info('\nDeploy module - ', moduleName);
    if (!checkIfExist(moduleState)) {
      cli.info('Nothing to deploy');
      process.exit(0);
    }

    // initialize empty tx data
    const initializedTxModuleState = txGenerator.initTx(moduleState);
    await prompter.promptContinueDeployment();

    try {
      await executor.execute(moduleName, initializedTxModuleState, module.getRegistry(), module.getResolver());
      await executor.executeModuleEvents(moduleName, module.getAllModuleEvents().onSuccess);
    } catch (error) {
      await executor.executeModuleEvents(moduleName, module.getAllModuleEvents().onFail);

      throw error;
    }

    await executor.executeModuleEvents(moduleName, module.getAllModuleEvents().onCompletion);
  }
}

export async function diff(resolvedPath: string, states: string[], moduleResolver: ModuleResolver, moduleStateRepo: ModuleStateRepo) {
  const modules = await require(resolvedPath);

  for (const [moduleName, modFunc] of Object.entries(modules)) {
    const module = await modFunc as Module;

    let stateFileRegistry = await moduleStateRepo.getStateIfExist(moduleName);
    for (const moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName);

      stateFileRegistry = StateResolver.mergeStates(stateFileRegistry, moduleState);
    }

    const moduleState: ModuleState | null = moduleResolver.resolve(module.getAllBindings(), module.getAllEvents(), module.getAllModuleEvents(), stateFileRegistry);
    if (!checkIfExist(moduleState)) {
      cli.info('Current module state is empty, add something and try again.');
      process.exit(0);
    }

    if (moduleResolver.checkIfDiff(stateFileRegistry, moduleState)) {
      cli.info(`\nModule: ${moduleName}`);
      moduleResolver.printDiffParams(stateFileRegistry, moduleState);
    } else {
      cli.info(`Nothing changed from last revision - ${moduleName}`);
    }
  }
}
