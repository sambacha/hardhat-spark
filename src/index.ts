import { cli } from 'cli-ux';
import ConfigService from './packages/config/service';
import { OutputFlags } from '@oclif/parser/lib/parse';
import { Module } from './interfaces/mortar';
import { checkIfExist } from './packages/utils/util';
import { ModuleStateRepo } from './packages/modules/states/state_repo';
import { ModuleResolver } from './packages/modules/module_resolver';
import { EthTxGenerator } from './packages/ethereum/transactions/generator';
import { TxExecutor } from './packages/ethereum/transactions/executor';
import { StateResolver } from './packages/modules/states/state_resolver';
import { ModuleState } from './packages/modules/states/module';
import { ModuleTypings } from './packages/modules/typings';
import { IConfigService } from './packages/config';
import { IPrompter } from './packages/utils/promter';
import { WalletWrapper } from './packages/ethereum/wallet/wrapper';
import { ethers } from 'ethers';

export function init(flags: OutputFlags<any>, configService: ConfigService) {
  const privateKeys = (flags.privateKeys as string).split(',');

  const mnemonic = (flags.mnemonic as string);
  const hdPath = (flags.hdPath as string);

  configService.generateAndSaveConfig(privateKeys, mnemonic, hdPath);

  cli.info('You have successfully configured mortar.');
}

export async function deploy(
  migrationFilePath: string,
  states: string[],
  moduleStateRepo: ModuleStateRepo,
  moduleResolver: ModuleResolver,
  txGenerator: EthTxGenerator,
  prompter: IPrompter,
  executor: TxExecutor,
  configService: IConfigService,
  walletWrapper: WalletWrapper,
) {
  const modules = await require(migrationFilePath);

  const rpcProvider = process.env.MORTAR_RPC_PROVIDER;
  const wallets = configService.getAllWallets(rpcProvider);
  const mortarWallets = walletWrapper.wrapWallets(wallets);

  for (const [moduleName, moduleFunc] of Object.entries(modules)) {
    const module = (await moduleFunc) as Module;
    if (module.isInitialized()) {
      continue;
    }

    await module.init(mortarWallets as ethers.Wallet[]);
    moduleStateRepo.initStateRepo(moduleName);

    let stateFileRegistry = await moduleStateRepo.getStateIfExist(moduleName);
    for (const moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName);

      stateFileRegistry = StateResolver.mergeStates(stateFileRegistry, moduleState);
    }

    const moduleState: ModuleState | null = moduleResolver.resolve(module.getAllBindings(), module.getAllEvents(), module.getAllModuleEvents(), stateFileRegistry);
    await prompter.startModuleDeploy(moduleName, moduleState);
    if (!checkIfExist(moduleState)) {
      prompter.nothingToDeploy();
    }

    // initialize empty tx data
    if (module.getCustomGasPriceProvider()) {
      txGenerator.changeGasPriceCalculator(module.getCustomGasPriceProvider());
    }

    if (module.getCustomNonceManager()) {
      txGenerator.changeNonceManager(module.getCustomNonceManager());
    }

    if (module.getCustomTransactionSinger()) {
      txGenerator.changeTransactionSinger(module.getCustomTransactionSinger());
    }

    const initializedTxModuleState = txGenerator.initTx(moduleState);
    await prompter.promptContinueDeployment();

    try {
      await executor.execute(moduleName, initializedTxModuleState, module.getRegistry(), module.getResolver(), module.getModuleConfig());
      await executor.executeModuleEvents(moduleName, moduleState, module.getAllModuleEvents().onSuccess);
    } catch (error) {
      await executor.executeModuleEvents(moduleName, moduleState, module.getAllModuleEvents().onFail);

      throw error;
    }

    await executor.executeModuleEvents(moduleName, moduleState, module.getAllModuleEvents().onCompletion);

    prompter.finishModuleDeploy();
  }
}

export async function diff(resolvedPath: string, states: string[], moduleResolver: ModuleResolver, moduleStateRepo: ModuleStateRepo, configService: IConfigService) {
  const modules = await require(resolvedPath);

  const rpcProvider = process.env.MORTAR_RPC_PROVIDER;
  const wallets = configService.getAllWallets(rpcProvider);

  for (const [moduleName, modFunc] of Object.entries(modules)) {
    const module = await modFunc as Module;
    await module.init(wallets);

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

export async function genTypes(resolvedPath: string, moduleTypings: ModuleTypings) {
  const modules = await require(resolvedPath);

  for (const [moduleName, modFunc] of Object.entries(modules)) {
    const module = await modFunc as Module;
    await module.init();

    moduleTypings.generate(moduleName, module);
  }
}
