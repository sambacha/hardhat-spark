import { cli } from 'cli-ux';
import { OutputFlags } from '@oclif/parser/lib/parse';
import { Module, ModuleOptions } from './interfaces/hardhat_ignition';
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
import { HardhatIgnitionConfig } from './packages/types/config';
import { loadScript } from './packages/utils/typescript-checker';
import { ModuleUsage } from './packages/modules/module_usage';
import { MissingContractAddressInStateFile } from './packages/types/errors';
import * as cls from 'cls-hooked';
import * as path from 'path';
import chalk from 'chalk';
import { INITIAL_MSG, MODULE_NAME_DESC } from './packages/tutorial/tutorial_desc';
import { TutorialService } from './packages/tutorial/tutorial_service';
import { StateMigrationService } from './packages/modules/states/state_migration_service';
import { ModuleMigrationService } from './packages/modules/module_migration';

export * from './interfaces/hardhat_ignition';
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

export function init(flags: OutputFlags<any>, configService: IConfigService) {
  const privateKeys = (flags.privateKeys as string).split(',');

  const mnemonic = (flags.mnemonic as string);
  const hdPath = (flags.hdPath as string);

  configService.generateAndSaveConfig(privateKeys, mnemonic, hdPath);
  configService.saveEmptyIgnitionConfig(process.cwd(), flags.configScriptPath, flags.reinit);

  cli.info('You have successfully configured ignition.');
}

export async function deploy(
  deploymentFilePath: string,
  config: HardhatIgnitionConfig,
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
  // this is needed in order to support both js and ts
  const modules = await loadScript(deploymentFilePath, test);

  // wrapping ether.Wallet in order to support state file storage
  const rpcProvider = process.env.IGNITION_RPC_PROVIDER;
  const wallets = configService.getAllWallets(rpcProvider);
  const ignitionWallets = walletWrapper.wrapWallets(wallets);

  for (const [moduleName, moduleFunc] of Object.entries(modules)) {
    const module = (await moduleFunc) as Module;

    // if module is initialized it means it is sub module inside bigger one. Only modules that are not initialized
    // can be executed
    if (module.isInitialized()) {
      continue;
    }

    // ability to surface module's context when using subModule functionality
    const moduleSession = cls.createNamespace('module');
    await moduleSession.runAndReturn(async () => {
      await module.init(moduleSession, ignitionWallets as ethers.Wallet[], undefined, {
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

    // setting up custom functionality
    if (module.getCustomGasPriceProvider()) {
      txGenerator.changeGasPriceCalculator(config.gasPriceProvider);
    }

    if (module.getCustomNonceManager()) {
      txGenerator.changeNonceManager(config.nonceManager);
    }

    if (module.getCustomTransactionSigner()) {
      txGenerator.changeTransactionSigner(config.transactionSigner);
    }

    const initializedTxModuleState = txGenerator.initTx(moduleState);
    await prompter.promptContinueDeployment();

    try {
      await executor.execute(moduleName, initializedTxModuleState, config?.registry, config?.resolver, module.getModuleConfig());
    } catch (error) {
      await executor.executeModuleEvents(moduleName, moduleState, module.getAllModuleEvents().onFail);

      throw error;
    }

    prompter.finishModuleDeploy(moduleName);
  }
}

export async function diff(
  resolvedPath: string,
  config: HardhatIgnitionConfig,
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
  ignitionConfig: HardhatIgnitionConfig,
  moduleTypings: ModuleTypings,
  config: IConfigService,
  prompter: IPrompter,
) {
  const modules = await loadScript(resolvedPath);
  const wallets = config.getAllWallets();

  for (const [moduleName, modFunc] of Object.entries(modules)) {
    const module = await modFunc as Module;
    const moduleSession = cls.createNamespace('module');
    await moduleSession.runAndReturn(async () => {
      await module.init(moduleSession, wallets, undefined, ignitionConfig as ModuleOptions);
    });

    const deploymentFolder = path.dirname(resolvedPath);
    moduleTypings.generate(deploymentFolder, moduleName, module);
  }

  prompter.generatedTypes();
}

export async function usage(
  config: HardhatIgnitionConfig,
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

  const rpcProvider = process.env.IGNITION_RPC_PROVIDER;
  const wallets = configService.getAllWallets(rpcProvider);
  const ignitionWallets = walletWrapper.wrapWallets(wallets);

  for (const [moduleName, moduleFunc] of Object.entries(modules)) {
    prompter.startingModuleUsageGeneration(moduleName);

    const module = (await moduleFunc) as Module;
    if (module.isInitialized()) {
      continue;
    }

    const moduleSession = cls.createNamespace('module');
    await moduleSession.runAndReturn(async () => {
      await module.init(moduleSession, ignitionWallets as ethers.Wallet[], undefined, {
        params: config?.params,
      });
    });
    moduleStateRepo.initStateRepo(moduleName);

    let stateFileRegistry = await moduleStateRepo.getStateIfExist(moduleName);
    for (const moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName);

      stateFileRegistry = StateResolver.mergeStates(stateFileRegistry, moduleState);
    }

    const rawUsage = await moduleUsage.generateRawUsage(moduleName, stateFileRegistry);

    for (const [elementName, element] of Object.entries(rawUsage)) {
      const contractAddress = element.deployMetaData.contractAddress;

      if (!checkIfExist(contractAddress)) {
        throw new MissingContractAddressInStateFile(`Cannot find deployed contract address for binding: ${elementName}`);
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
  moduleMigrationService: ModuleMigrationService,
  moduleName: string
) {
  // search for truffle build folder
  const builds = stateMigrationService.searchBuild();

  // extract potential build files
  const validBuilds = stateMigrationService.extractValidBuilds(builds);

  // map build files data to ignition state file
  const ignitionStateFiles = stateMigrationService.mapBuildsToStateFile(validBuilds);

  // store ignition state file
  await stateMigrationService.storeNewStateFiles(moduleName, ignitionStateFiles);

  const moduleStateBindings = await moduleMigrationService.mapModuleStateFileToContractBindingsMetaData(ignitionStateFiles);
  const moduleFile = await moduleMigrationService.generateModuleFile(moduleName, moduleStateBindings);
  await moduleMigrationService.storeModuleFile(moduleFile, moduleName);

  cli.info('Migration successfully completed!');
}
