import * as path from 'path';
import { ContractBinding, module, ModuleBuilder, } from '../../../src/interfaces/mortar';
import { BigNumber, ethers, providers } from 'ethers';
import { RemoteBucketStorage } from '../../../src/packages/modules/states/registry/remote_bucket_storage';
import { filler } from '../../../src/interfaces/helper/macros';
import { EthGasStationProvider, GasPriceType } from './custom_providers/eth_gas_station_provider';
import { TransactionManager } from './custom_providers/transaction_manager';
import { GasPriceCalculator } from '../../../src/packages/ethereum/gas/calculator';

require('dotenv').config({path: path.resolve(__dirname + './../.env')});

// import { FileSystemRegistry } from '../../../src/packages/modules/states/registry/file_system';

const {
  GOOGLE_ACCESS_KEY,
  GOOGLE_SECRET_ACCESS_KEY,
  ETH_GAS_STATION_API_KEY
} = process.env;

export const ExampleModule = module('ExampleModule', async (m: ModuleBuilder, wallets: ethers.Wallet[]) => {
  // const fileSystem = new FileSystemRegistry("./")
  // m.setRegistry(fileSystem)
  const remoteBucketStorage = new RemoteBucketStorage(
    'https://storage.googleapis.com',
    'europe-west3',
    'mortar_state_bucket',
    GOOGLE_ACCESS_KEY || '',
    GOOGLE_SECRET_ACCESS_KEY || '',
  );
  m.setRegistry(remoteBucketStorage);
  const gasPriceProvider = new EthGasStationProvider(ETH_GAS_STATION_API_KEY, GasPriceType.average);
  m.setCustomGasPriceProvider(gasPriceProvider);

  const provider = new providers.JsonRpcProvider('http://localhost:8545');
  const gasCalculator = new GasPriceCalculator(provider);
  const txManager = new TransactionManager(provider, wallets[0], Number(process.env.MORTAR_NETWORK_ID), gasCalculator, gasPriceProvider);
  m.setCustomNonceManager(txManager);
  m.setCustomTransactionSigner(txManager); // @TODO think how to extract all above to some kind of config script/init

  await filler(m, 'on start distribute ethers to all accounts', wallets[0], wallets.slice(1));

  const Example = m.contract('Example', -1, '2', 3, '4', true, BigNumber.from(5), '0xdd2fd4581271e230360230f9337d5c0430bf44c0')
    .setDeployer(wallets[30])
    .force();
  Example.shouldRedeploy((diff: ContractBinding) => {
    return true;
  });

  const SecondExample = m.contract('SecondExample', Example, ['some', 'random', 'string'], [['hello']], 123);
  const ThirdExample = m.contract('ThirdExample', SecondExample);

  m.registerAction('getName', (): any => {
    return 'hello';
  });

  const firstAfterDeployment = m.group(Example, SecondExample).afterDeployment(m, 'firstAfterDeployment', async (): Promise<void> => {
    const example = Example.instance();

    await example.setExample(100);
    let value = await example.getExample();

    await example.setExample(120);
    value = await example.getExample();

    await SecondExample.instance().setExample(Example);

    m.registerAction('getName', (): any => {
      return value;
    });
  }, Example, SecondExample);

  m.group(Example, firstAfterDeployment).afterDeployment(m, 'secondAfterDeployment', async () => {
    const example = Example.instance();

    await example.setExample(100);
    await example.setExample(130);
  }, Example);

  SecondExample.afterCompile(m, 'firstAfterCompile', async () => {
    // console.log('This is after compile');
  });

  ThirdExample.beforeCompile(m, 'firstBeforeCompile', async () => {
    // console.log('This is before compile: ', Example.name);
  }, Example);

  ThirdExample.beforeDeployment(m, 'firstBeforeDeployment', async () => {
    // console.log('This is before deployment: ', Example.name);
  }, Example);

  ThirdExample.onChange(m, 'firstOnChange', async () => {
    // console.log('This is on change:', Example.name);
  }, Example);

  m.onStart('OnStart', async () => {
    // console.log('onStart');
  });

  m.onCompletion('onCompletion', async () => {
    // console.log('onCompletion');
  });

  m.onFail('onFail', async () => {
    // console.log('onFail');
  });

  m.onSuccess('onSuccess', async () => {
    // console.log('onSuccess');
  });
});

export const SecondModule = module('SecondExample', async (m: ModuleBuilder) => {
  const Example = m.contract('Example', -1, '2', 3, '4', true, BigNumber.from(5), '0xdd2fd4581271e230360230f9337d5c0430bf44c0');
  const SecondExample = m.contract('SecondExample', Example, ['some', 'random', 'string'], [['hello']], 123);
  m.contract('ThirdExample', SecondExample);
});
