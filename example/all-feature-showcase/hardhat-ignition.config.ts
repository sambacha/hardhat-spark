import { RemoteBucketStorage } from '../../src';
import { HardhatIgnitionConfig } from '../../src';
// @ts-ignore
import { EthGasStationProvider, GasPriceType } from './deployment/custom_providers/eth_gas_station_provider';
// @ts-ignore
import { TransactionManager } from './deployment/custom_providers/transaction_manager';
import { ethers, providers } from 'ethers';
import { GasPriceCalculator } from '../../src/packages/ethereum/gas/calculator';
import * as path from 'path';

require('dotenv').config({path: path.resolve(__dirname + '/.env')});

const {
  GOOGLE_ACCESS_KEY,
  GOOGLE_SECRET_ACCESS_KEY,
  ETH_GAS_STATION_API_KEY,
  PRIVATE_KEY
} = process.env;

const gasPriceProvider = new EthGasStationProvider(ETH_GAS_STATION_API_KEY, GasPriceType.average);
const provider = new providers.JsonRpcProvider('http://localhost:8545');
const gasCalculator = new GasPriceCalculator(provider);
const wallet = new ethers.Wallet(PRIVATE_KEY);
const txManager = new TransactionManager(provider, wallet, Number(process.env.IGNITION_NETWORK_ID), gasCalculator, gasPriceProvider);
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
    '31337': {
      rpc_provider: 'http://localhost:8545',
      privateKeys: [
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
      ],
      mnemonic: 'test test test test test test test test test test test junk',
      hdPath: "m/44'/60'/0'/0",
    }
  },
  // registry: registryAndResolver,
  // resolver: registryAndResolver,
  // gasPriceProvider: gasPriceProvider,
  // nonceManager: txManager,
  // transactionSigner: txManager
};
