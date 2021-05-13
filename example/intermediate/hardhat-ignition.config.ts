import { HardhatIgnitionConfig, RemoteBucketStorage } from 'ignition-core';
import path from 'path';

require('dotenv').config({path: path.resolve(__dirname + '/.env')});

const {
  GOOGLE_ACCESS_KEY,
  GOOGLE_SECRET_ACCESS_KEY,
  KOVAN_PRIV_KEY,
  INFURA_KEY,
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
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
  ],
  mnemonic: 'test test test test test test test test test test test junk',
  hdPath: "m/44'/60'/0'/0",
  networks: {
    'kovan': {
      networkId: '42',
      rpcProvider: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      privateKeys: [
        KOVAN_PRIV_KEY,
      ],
      localDeployment: false,
      blockConfirmation: 2,
      // gasPriceBackoff: {
      //   maxGasPrice: ethers.utils.parseUnits('20', 'gwei'),
      //   backoffTime: 1000 * 15,
      //   numberOfRetries: 3,
      // }
    }
  },
  // resolver: registryAndResolver,
};
