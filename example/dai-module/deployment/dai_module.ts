import * as path from 'path';
require('dotenv').config({path: path.resolve(__dirname + './../.env')});

import { module } from '../../../src/interfaces/mortar';
// @ts-ignore
import { RemoteBucketStorage } from '../../../src/packages/modules/states/registry/remote_bucket_storage';
import { DaiModuleBuilder } from '../.mortar/DaiModule/DaiModule';

const {
  GOOGLE_ACCESS_KEY,
  GOOGLE_SECRET_ACCESS_KEY,
} = process.env;

export const DaiModule = module('DaiModule', async (m: DaiModuleBuilder) => {
  m.contract('Dai', 1);

  const remoteBucketStorage = new RemoteBucketStorage(
    'https://storage.googleapis.com',
    'europe-west3',
    'mortar_state_bucket',
    GOOGLE_ACCESS_KEY || '',
    GOOGLE_SECRET_ACCESS_KEY || '',
  );
  m.setRegistry(remoteBucketStorage);
});
