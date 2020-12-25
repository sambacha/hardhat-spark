import * as path from 'path';
require('dotenv').config({path: path.resolve(__dirname + './../.env')});

import { module, ModuleBuilder } from '../../../src/interfaces/mortar';
// @ts-ignore
import { RemoteBucketStorage } from '../../../src/packages/modules/states/registry/remote_bucket_storage';

const {
  GOOGLE_ACCESS_KEY,
  GOOGLE_SECRET_ACCESS_KEY,
} = process.env;

export const DaiModule = module('DaiModule', async (m: ModuleBuilder) => {
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
