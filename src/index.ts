import { cli } from 'cli-ux';
import { OutputFlags } from '@oclif/parser/lib/parse';
import { Module, ModuleOptions } from './interfaces/mortar';
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
import { MortarConfig } from './packages/types/config';
import { loadScript } from './packages/utils/typescript-checker';
import { ModuleUsage } from './packages/modules/module_usage';
import { MissingContractAddressInStateFile, UserError } from './packages/types/errors';
import * as cls from 'cls-hooked';
import * as path from 'path';
import chalk from 'chalk';
import { INITIAL_MSG, MODULE_NAME_DESC } from './packages/tutorial/tutorial_desc';
import { TutorialService } from './packages/tutorial/tutorial_service';
import { Migration } from './packages/types/migration';
import { StateMigrationService } from './packages/modules/states/state_migration_service';

export * from './interfaces/mortar';
export * from './interfaces/helper/expectancy';
export * from './interfaces/helper/macros';
export * from './usage_interfaces/tests';
export * from './usage_interfaces/index';
export * from './packages/config';
export * from './packages/types';
export * from './packages/ethereum/compiler';
export * from './packages/ethereum/gas';
export * from './packages/ethereum/transactions';
export * from './packages/ethereum/wallet/wrapper';
export * from './packages/modules/states/module';
export * from './packages/modules/states/registry';
export * from './packages/modules/states/registry/remote_bucket_storage';
export * from './packages/modules/typings';

export * as hardhat from './packages/hardhat_plugin';

export function init(flags: OutputFlags<any>, configService: IConfigService) {
  const privateKeys = (flags.privateKeys as string).split(',');

  const mnemonic = (flags.mnemonic as string);
  const hdPath = (flags.hdPath as string);

  configService.generateAndSaveConfig(privateKeys, mnemonic, hdPath);
  configService.saveEmptyMortarConfig(process.cwd(), flags.configScriptPath, flags.reinit);

  cli.info('You have successfully configured mortar.');
}

export async function deploy(
  deploymentFilePath: string,
  config: MortarConfig,
  states: string[],
  moduleStateRepo: ModuleStateRepo,
  moduleResolver: ModuleResolver,
  txGenerator: EthTxGenerator,
  prompter: IPrompter,
  executor: TxExecutor,
  configService: IConfigService,
  walletWrapper: WalletWrapper,
  test: boolean = false
) {
  const modules = await loadScript(deploymentFilePath, test);

  const rpcProvider = process.env.MORTAR_RPC_PROVIDER;
  const wallets = configService.getAllWallets(rpcProvider);
  const mortarWallets = walletWrapper.wrapWallets(wallets);

  for (const [moduleName, moduleFunc] of Object.entries(modules)) {
    const module = (await moduleFunc) as Module;
    if (module.isInitialized()) {
      continue;
    }

    // ability to surface module's context when using subModule functionality
    const moduleSession = cls.createNamespace('module');
    await moduleSession.runAndReturn(async () => {
      await module.init(moduleSession, mortarWallets as ethers.Wallet[], undefined, {
        params: config?.params,
      });
    });
    moduleStateRepo.initStateRepo(moduleName);

    // merging state file with provided states files
    let stateFileRegistry = await moduleStateRepo.getStateIfExist(moduleName);
    for (const moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName);

      stateFileRegistry = StateResolver.mergeStates(stateFileRegistry, moduleState);
    }

    // resolving contract and events dependencies and determining execution order
    const moduleState: ModuleState | null = moduleResolver.resolve(module.getAllBindings(), module.getAllEvents(), module.getAllModuleEvents(), stateFileRegistry);
    await prompter.startModuleDeploy(moduleName, moduleState);
    if (!checkIfExist(moduleState)) {
      prompter.nothingToDeploy();
    }

    // setting up custom functionality
    if (module.getCustomGasPriceProvider()) {
      txGenerator.changeGasPriceCalculator(config.gasPriceProvider);
    }

    if (module.getCustomNonceManager()) {
      txGenerator.changeNonceManager(config.nonceManager);
    }

    if (module.getCustomTransactionSinger()) {
      txGenerator.changeTransactionSinger(config.transactionSinger);
    }

    const initializedTxModuleState = txGenerator.initTx(moduleState);
    await prompter.promptContinueDeployment();

    try {
      await executor.execute(moduleName, initializedTxModuleState, config.registry, config.resolver, module.getModuleConfig());
    } catch (error) {
      await executor.executeModuleEvents(moduleName, moduleState, module.getAllModuleEvents().onFail);

      throw error;
    }

    prompter.finishModuleDeploy(moduleName);
  }
}

export async function diff(
  resolvedPath: string,
  config: MortarConfig,
  states: string[],
  moduleResolver: ModuleResolver,
  moduleStateRepo: ModuleStateRepo,
  configService: IConfigService,
  test: boolean = false
) {
  const modules = await loadScript(resolvedPath, test);

  const wallets = configService.getAllWallets();

  for (const [moduleName, modFunc] of Object.entries(modules)) {
    const module = await modFunc as Module;
    if (module.isInitialized()) {
      continue;
    }

    const moduleSession = cls.createNamespace('module');
    await moduleSession.runAndReturn(async () => {
      await module.init(moduleSession, wallets, undefined, {
        params: config?.params,
      });
    });
    moduleStateRepo.initStateRepo(moduleName);

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

export async function genTypes(
  resolvedPath: string,
  mortarConfig: MortarConfig,
  moduleTypings: ModuleTypings,
  config: IConfigService,
) {
  const modules = await loadScript(resolvedPath);
  const wallets = config.getAllWallets();

  for (const [moduleName, modFunc] of Object.entries(modules)) {
    const module = await modFunc as Module;
    const moduleSession = cls.createNamespace('module');
    await moduleSession.runAndReturn(async () => {
      await module.init(moduleSession, wallets, undefined, mortarConfig as ModuleOptions);
    });

    const deploymentFolder = path.dirname(resolvedPath);
    moduleTypings.generate(deploymentFolder, moduleName, module);
  }
}

export async function usage(
  config: MortarConfig,
  deploymentFilePath: string,
  states: string[],
  configService: IConfigService,
  walletWrapper: WalletWrapper,
  moduleStateRepo: ModuleStateRepo,
  moduleResolver: ModuleResolver,
  moduleUsage: ModuleUsage,
  prompter: IPrompter,
) {
  const modules = await loadScript(deploymentFilePath);

  const networkId = process.env.MORTAR_NETWORK_ID;
  const rpcProvider = process.env.MORTAR_RPC_PROVIDER;
  const wallets = configService.getAllWallets(rpcProvider);
  const mortarWallets = walletWrapper.wrapWallets(wallets);

  for (const [moduleName, moduleFunc] of Object.entries(modules)) {
    prompter.startingModuleUsageGeneration(moduleName);

    const module = (await moduleFunc) as Module;
    if (module.isInitialized()) {
      continue;
    }

    const moduleSession = cls.createNamespace('module');
    await moduleSession.runAndReturn(async () => {
      await module.init(moduleSession, mortarWallets as ethers.Wallet[], undefined, {
        params: config?.params,
      });
    });
    moduleStateRepo.initStateRepo(moduleName);

    let stateFileRegistry = await moduleStateRepo.getStateIfExist(moduleName);
    for (const moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName);

      stateFileRegistry = StateResolver.mergeStates(stateFileRegistry, moduleState);
    }

    const moduleState: ModuleState | null = moduleResolver.resolve(module.getAllBindings(), module.getAllEvents(), module.getAllModuleEvents(), stateFileRegistry);

    if (!config.resolver) {
      throw new UserError('Custom config resolver must be provided.');
    }

    const rawUsage = await moduleUsage.generateRawUsage(moduleName, moduleState);

    for (const [elementName, ] of Object.entries(rawUsage)) {
      const contractAddress = await config.resolver.resolveContract(Number(networkId), moduleName, elementName);

      if (!checkIfExist(contractAddress)) {
        throw new MissingContractAddressInStateFile(`Cannot find deployed contract address in binding: ${elementName}`);
      }
    }

    const file = await moduleUsage.generateUsageFile(rawUsage);
    await moduleUsage.storeUsageFile(file);
    prompter.finishedModuleUsageGeneration(moduleName);
  }
}

export async function tutorial(
  tutorialService: TutorialService,
) {
  const scriptRoot = process.cwd();

  cli.info(INITIAL_MSG);
  const yes = await cli.confirm('Are you ready to start? (make sure you have some contracts to start with ;)) (yes/no)');
  if (!yes) {
    return;
  }

  cli.info(chalk.gray(MODULE_NAME_DESC));
  const moduleName = await cli.prompt('Module name?');

  tutorialService.setDeploymentPath(scriptRoot);
  tutorialService.setModuleName(moduleName);

  await tutorialService.start();
}

export async function migrate(
  stateMigrationService: StateMigrationService,
  stateFileType: Migration, // currently only truffle so it is not used
  moduleName: string
) {
  const currentPath = path.resolve(process.cwd(), 'build');

  // search for truffle build folder
  const builds = stateMigrationService.searchBuild(currentPath);

  // extract potential build files
  const validBuilds = stateMigrationService.extractValidBuilds(builds);

  // map build files data to mortar state file
  const mortarStateFiles = stateMigrationService.mapBuildsToStateFile(validBuilds);

  // store mortar state file
  await stateMigrationService.storeNewStateFiles(moduleName, mortarStateFiles);
}
