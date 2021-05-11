import { cli } from 'cli-ux';
import { Module, ModuleOptions } from './interfaces/hardhat_ignition';
import { checkIfExist } from './services/utils/util';
import { ModuleStateRepo } from './services/modules/states/state_repo';
import { ModuleResolver } from './services/modules/module_resolver';
import { EthTxGenerator } from './services/ethereum/transactions/generator';
import { TxExecutor } from './services/ethereum/transactions/executor';
import { StateResolver } from './services/modules/states/state_resolver';
import { ModuleState } from './services/modules/states/module';
import { ModuleTypings } from './services/modules/typings';
import { IConfigService } from './services/config';
import { ILogging, Logging } from './services/utils/logging';
import { WalletWrapper } from './services/ethereum/wallet/wrapper';
import { ethers } from 'ethers';
import { GasPriceBackoff, HardhatIgnitionConfig } from './services/types/config';
import { loadScript } from './services/utils/typescript_checker';
import { ModuleUsage } from './services/modules/module_usage';
import {
  MissingContractAddressInStateFile,
  NoDeploymentModuleError,
} from './services/types/errors';
import * as cls from 'cls-hooked';
import * as path from 'path';
import chalk from 'chalk';
import { INITIAL_MSG, MODULE_NAME_DESC } from './services/tutorial/tutorial_desc';
import { TutorialService } from './services/tutorial/tutorial_service';
import { StateMigrationService } from './services/modules/states/state_migration_service';
import { ModuleMigrationService } from './services/modules/module_migration';
import { ModuleDeploymentSummaryService } from './services/modules/module_deployment_summary';
import { SimpleOverviewPrompter } from './services/utils/logging/simple_logging';
import {
  DEFAULT_DEPLOYMENT_FOLDER,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
  DEFAULT_RPC_PROVIDER
} from './services/utils/constants';
import ConfigService from './services/config/service';
import fs from 'fs';
import { SystemCrawlingService } from './services/tutorial/system_crawler';
import * as inquirer from 'inquirer';
import { JsonPrompter } from './services/utils/logging/json_logging';
import { OverviewPrompter } from './services/utils/logging/react-terminal-ui';
import { StreamlinedPrompter } from './services/utils/logging/prompter';
import { GlobalConfigService } from './services/config/global_config_service';
import { AnalyticsService } from './services/utils/analytics/analytics_service';
import { IAnalyticsService } from './services/utils/analytics';
import { ModulePackagingService } from './services/modules/module_packaging';
import { HardhatIgnition } from './usage_interfaces/hardhat_plugin';

export * from './interfaces/hardhat_ignition';
export * from './interfaces/helper/expectancy';
export * from './interfaces/helper/macros';
export * from './usage_interfaces/tests';
export * from './usage_interfaces/index';
export * from './services/config';
export * from './services/types';
export * from './services/ethereum/compiler';
export * from './services/ethereum/gas';
export * from './services/ethereum/transactions';
export * from './services/ethereum/wallet/wrapper';
export * from './services/modules/states/module';
export * from './services/modules/states/registry';
export * from './services/modules/states/registry/remote_bucket_storage';
export * from './services/modules/typings';
export * from './services/utils/util';

export async function deploy(
  deploymentFilePath: string,
  config: HardhatIgnitionConfig,
  states: string[],
  moduleStateRepo: ModuleStateRepo,
  moduleResolver: ModuleResolver,
  txGenerator: EthTxGenerator,
  prompter: ILogging, // @todo
  executor: TxExecutor,
  configService: IConfigService,
  walletWrapper: WalletWrapper,
  moduleDeploymentSummaryService: ModuleDeploymentSummaryService,
  analyticsService: IAnalyticsService,
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

    // If a module is initialized it means it is sub module inside the bigger one. Only modules that are not initialized
    // can be executed.
    if (module.isInitialized()) {
      continue;
    }

    // ability to surface module's context when using subModule functionality
    const moduleSession = cls.createNamespace('module');
    await moduleSession.runAndReturn(async () => {
      await module.init(moduleSession, ignitionWallets as ethers.Wallet[], undefined, {
        params: config?.params || {},
      });
    });
    moduleStateRepo.initStateRepo(moduleName);

    // merging state file with provided states files
    let stateFileRegistry = await moduleStateRepo.getStateIfExist(moduleName);
    for (const moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName);

      stateFileRegistry = StateResolver.mergeStates(stateFileRegistry, moduleState);
    }

    prompter.startModuleResolving(moduleName);
    // resolving contract and events dependencies and determining execution order
    const moduleState: ModuleState | null = await moduleResolver.resolve(module.getAllBindings(), module.getAllEvents(), module.getAllModuleEvents(), stateFileRegistry);
    prompter.finishModuleResolving(moduleName);

    // setting up custom functionality
    if (
      module.getCustomGasPriceProvider() &&
      config.gasPriceProvider
    ) {
      txGenerator.changeGasPriceCalculator(config.gasPriceProvider);
    }

    if (
      module.getCustomNonceManager() &&
      config.nonceManager
    ) {
      txGenerator.changeNonceManager(config.nonceManager);
    }

    if (
      module.getCustomTransactionSigner() &&
      config.transactionSigner
    ) {
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

    const summary = await moduleDeploymentSummaryService.showSummary(moduleName, stateFileRegistry);
    prompter.finishModuleDeploy(moduleName, summary);
    await analyticsService.sendCommandHit('deploy');
  }
}

export async function diff(
  resolvedPath: string,
  config: HardhatIgnitionConfig,
  states: string[],
  moduleResolver: ModuleResolver,
  moduleStateRepo: ModuleStateRepo,
  configService: IConfigService,
  analyticsService: IAnalyticsService,
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
        params: config?.params || {},
      });
    });
    moduleStateRepo.initStateRepo(moduleName);

    let stateFileRegistry = await moduleStateRepo.getStateIfExist(moduleName);
    for (const moduleStateName of states) {
      const moduleState = await moduleStateRepo.getStateIfExist(moduleStateName);

      stateFileRegistry = StateResolver.mergeStates(stateFileRegistry, moduleState);
    }

    const moduleState: ModuleState | null = await moduleResolver.resolve(module.getAllBindings(), module.getAllEvents(), module.getAllModuleEvents(), stateFileRegistry);
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
    await analyticsService.sendCommandHit('diff');
  }
}

export async function genTypes(
  resolvedPath: string,
  ignitionConfig: HardhatIgnitionConfig,
  moduleTypings: ModuleTypings,
  config: IConfigService,
  prompter: ILogging,
  analyticsService: IAnalyticsService,
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
  await analyticsService.sendCommandHit('genTypes');
}

export async function usage(
  config: HardhatIgnitionConfig,
  deploymentFilePath: string,
  states: string[],
  configService: IConfigService,
  walletWrapper: WalletWrapper,
  moduleStateRepo: ModuleStateRepo,
  moduleUsage: ModuleUsage,
  prompter: ILogging,
  analyticsService: IAnalyticsService,
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
        params: config?.params || {},
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
        throw new MissingContractAddressInStateFile(`Cannot find deployed contract address for contract: ${elementName}`);
      }
    }

    const file = await moduleUsage.generateUsageFile(rawUsage);
    await moduleUsage.storeUsageFile(file);
    prompter.finishedModuleUsageGeneration(moduleName);
    await analyticsService.sendCommandHit('usage');
  }
}

export async function tutorial(
  tutorialService: TutorialService,
  analyticsService: IAnalyticsService,
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
  await analyticsService.sendCommandHit('genTypes');
}

export async function migrate(
  stateMigrationService: StateMigrationService,
  moduleMigrationService: ModuleMigrationService,
  moduleName: string,
  analyticsService: IAnalyticsService,
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
  await analyticsService.sendCommandHit('migration');

  cli.info('Migration successfully completed!');
}

export async function createPackage(modulePackagingService: ModulePackagingService) {
  // initialize empty dist folder with package.json
  await modulePackagingService.initializePackageDistributionFolder();

  // fetch all contracts from contracts folder and put it in package folder
  await modulePackagingService.copyAllContracts();

  // same for modules
  await modulePackagingService.copyAllDeploymentModules();
}

export async function defaultInputParams(moduleFilePath?: string, network?: string, state?: string, rpcProvider?: string, logging?: string, configScriptPath?: string): Promise<{
  networkName: string,
  networkId: string,
  gasPriceBackoff: GasPriceBackoff | undefined,
  rpcProvider: ethers.providers.JsonRpcProvider,
  states: string[],
  prompter: ILogging,
  config: HardhatIgnitionConfig,
  configService: IConfigService,
  parallelizeDeployment: boolean,
  analyticsService: IAnalyticsService,
  filePath: string,
}> {
  const globalConfigService = new GlobalConfigService();
  await globalConfigService.mustConfirmConsent();
  const analyticsService = new AnalyticsService(globalConfigService);

  let networkName = network || DEFAULT_NETWORK_NAME;
  const configService = new ConfigService(networkName);
  const config = await configService.initializeIgnitionConfig(process.cwd(), configScriptPath);

  let filePath = moduleFilePath;
  let isLocalDeployment = true;
  let parallelizeDeployment = config?.parallelizeDeployment || false;
  let gasPriceBackoff: GasPriceBackoff | undefined;
  if (!checkIfExist(networkName)) {
    networkName = DEFAULT_NETWORK_NAME;
  }

  let networkId: string = DEFAULT_NETWORK_ID;
  if (
    config?.networks &&
    config?.networks[networkName]
  ) {
    networkId = config?.networks[networkName]?.networkId as string;
  }
  if (!checkIfExist(networkId)) {
    networkId = DEFAULT_NETWORK_ID;
  }
  process.env.IGNITION_NETWORK_ID = String(networkId);
  const states: string[] = state?.split(',') || [];
  let provider = new ethers.providers.JsonRpcProvider();
  process.env.IGNITION_RPC_PROVIDER = DEFAULT_RPC_PROVIDER;
  if (
    config.networks &&
    config.networks[networkName]
  ) {
    if (checkIfExist(config.networks[networkName].rpcProvider)) {
      provider = new ethers.providers.JsonRpcProvider(
        String(config?.networks[networkName]?.rpcProvider)
      );
      process.env.IGNITION_RPC_PROVIDER = String(config?.networks[networkName]?.rpcProvider);
    }

    if (checkIfExist(config.networks[networkName].blockConfirmation)) {
      process.env.BLOCK_CONFIRMATION_NUMBER = String(config.networks[networkName].blockConfirmation);
    }

    if (
      config.networks[networkName].localDeployment
    ) {
      isLocalDeployment = config.networks[networkName].localDeployment || true;
    }

    if (
      !filePath &&
      config.networks[networkName].deploymentFilePath &&
      config.networks[networkName].deploymentFilePath != ''
    ) {
      filePath = config.networks[networkName].deploymentFilePath as string;
      if (!fs.existsSync(filePath)) {
        filePath = undefined;
      }
    }

    if (
      config.networks[networkName].gasPriceBackoff
    ) {
      gasPriceBackoff = config.networks[networkName].gasPriceBackoff as GasPriceBackoff;
    }

    if (
      checkIfExist(config.networks[networkName].parallelizeDeployment)
    ) {
      parallelizeDeployment = true;
    }
  }
  if (!filePath) {
    const systemCrawlingService = new SystemCrawlingService(process.cwd(), DEFAULT_DEPLOYMENT_FOLDER);
    const deploymentModules = systemCrawlingService.crawlDeploymentModule();
    const deploymentFileName = (await inquirer.prompt([{
      name: 'deploymentFileName',
      message: 'Deployments file:',
      type: 'list',
      choices: deploymentModules.map((v) => {
        return {
          name: v
        };
      }),
    }])).deploymentFileName;
    try {
      filePath = path.resolve(DEFAULT_DEPLOYMENT_FOLDER, deploymentFileName);
    } catch (e) {
      throw new NoDeploymentModuleError();
    }
  }
  if (checkIfExist(rpcProvider)) {
    provider = new ethers.providers.JsonRpcProvider(
      rpcProvider
    );
    process.env.IGNITION_RPC_PROVIDER = String(rpcProvider);
  }

  // choosing right prompter from user desires
  let prompter;
  switch (logging) {
    case Logging.simple:
      prompter = new SimpleOverviewPrompter();
      break;
    case Logging.json:
      prompter = new JsonPrompter();
      break;
    case Logging.streamlined: {
      let yes = true;
      if (
        networkName != DEFAULT_NETWORK_NAME &&
        !isLocalDeployment
      ) {
        const con = await cli.prompt('Would you like to be prompted at every single step? (Y/n)', {
          required: false
        });
        yes = con == 'n'; // @TODO Handle, N. NO
      }

      prompter = new StreamlinedPrompter(yes);
      break;
    }
    case Logging.overview:
    default: {
      prompter = new OverviewPrompter();
      break;
    }
  }

  return {
    networkName,
    networkId,
    rpcProvider: provider,
    filePath,
    states,
    gasPriceBackoff,
    prompter,
    config,
    configService,
    parallelizeDeployment,
    analyticsService,
  };
}
