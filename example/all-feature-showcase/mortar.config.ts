import { RemoteBucketStorage } from '../../src';
import { MortarConfig } from '../../src';
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
const txManager = new TransactionManager(provider, wallet, Number(process.env.MORTAR_NETWORK_ID), gasCalculator, gasPriceProvider);
const registryAndResolver = new RemoteBucketStorage(
  'https://storage.googleapis.com',
  'europe-west3',
  'mortar_state_bucket',
  GOOGLE_ACCESS_KEY || '',
  GOOGLE_SECRET_ACCESS_KEY || '',
);

export const config: MortarConfig = {
  // registry: registryAndResolver,
  resolver: registryAndResolver,
  // gasPriceProvider: gasPriceProvider,
  // nonceManager: txManager,
  // transactionSinger: txManager
};
