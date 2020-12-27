import * as path from 'path';

require('dotenv').config({path: path.resolve(__dirname + './../.env')});

import {
  ModuleBuilder,
  module,
} from '../../../src/interfaces/mortar';
import { BigNumber } from 'ethers';
import { RemoteBucketStorage } from '../../../src/packages/modules/states/registry/remote_bucket_storage';
import { FileSystemRegistry } from '../../../src/packages/modules/states/registry/file_system';

const {
  GOOGLE_ACCESS_KEY,
  GOOGLE_SECRET_ACCESS_KEY,
} = process.env;

export const ExampleModule = module('ExampleModule', async (m: ModuleBuilder) => {
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

  const Example = m.contract('Example', -1, '2', 3, '4', true, BigNumber.from(5), '0xdd2fd4581271e230360230f9337d5c0430bf44c0');
  const SecondExample = m.contract('SecondExample', Example, ['some', 'random', 'string'], [['hello']], 123);
  const ThirdExample = m.contract('ThirdExample', SecondExample);

  m.registerAction('getName', (): any => {
    return 'hello';
  });

  const firstAfterDeployment = Example.afterDeployment(m, 'firstAfterDeployment', async (): Promise<void> => {
    const example = Example.instance();

    await example.setExample(100);
    let value = await example.getExample();

    await example.setExample(120);
    value = await example.getExample();

    await SecondExample.instance().setExample(Example);

    m.registerAction('getName', (): any => {
      return value;
    });
  }, SecondExample);

  Example.afterDeployment(m, 'secondAfterDeployment', async (): Promise<void> => {
    const example = Example.instance();

    await example.setExample(100);
    await example.setExample(130);
  }, firstAfterDeployment);

  SecondExample.afterCompile(m, 'firstAfterCompile', async () => {
    console.log('This is after compile: ', SecondExample.bytecode);
  }, SecondExample);

  ThirdExample.beforeCompile(m, 'firstBeforeCompile', async () => {
    console.log('This is before compile: ', Example.name);
  }, Example);

  ThirdExample.beforeDeployment(m, 'firstBeforeDeployment', async () => {
    console.log('This is before deployment: ', Example.name);
  }, Example);

  ThirdExample.onChange(m, 'firstOnChange', async (): Promise<void> => {
    console.log('This is on change:', Example.name);
  }, Example);

  m.onStart('OnStart', async (): Promise<void> => {
    console.log('onStart');
  });

  m.onCompletion('onCompletion', async (): Promise<void> => {
    console.log('onCompletion');
  });

  m.onFail('onFail', async (): Promise<void> => {
    console.log('onFail');
  });

  m.onSuccess('onSuccess', async (): Promise<void> => {
    console.log('onSuccess');
  });
});

export const SecondModule = module('SecondExample', async (m: ModuleBuilder) => {
  const Example = m.contract('Example', -1, '2', 3, '4', true, BigNumber.from(5), '0xdd2fd4581271e230360230f9337d5c0430bf44c0');
  const SecondExample = m.contract('SecondExample', Example, ['some', 'random', 'string'], [['hello']], 123);
  m.contract('ThirdExample', SecondExample);
});
