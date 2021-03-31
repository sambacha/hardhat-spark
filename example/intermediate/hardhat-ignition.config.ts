import { HardhatIgnitionConfig } from '../../src';
import { RemoteBucketStorage } from '../../src';
import path from 'path';

require('dotenv').config({path: path.resolve(__dirname + '/.env')});

const {
  GOOGLE_ACCESS_KEY,
  GOOGLE_SECRET_ACCESS_KEY
} = process.env;

const registryAndResolver = new RemoteBucketStorage(
  'https://storage.googleapis.com',
  'europe-west3',
  'ignition_state_bucket',
  GOOGLE_ACCESS_KEY || '',
  GOOGLE_SECRET_ACCESS_KEY || '',
);

export const config: HardhatIgnitionConfig = {
  privateKeys: [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  ],
  mnemonic: 'test test test test test test test test test test test junk',
  hdPath: "m/44'/60'/0'/0"
  // resolver: registryAndResolver,
};
