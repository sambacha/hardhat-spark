import { HardhatIgnitionConfig } from '@tenderly/hardhat-ignition';
import path from 'path';

require('dotenv').config({path: path.resolve(__dirname + '/.env')});

const {
  PRIVATE_KEY,
  INFURA_KEY
} = process.env;

export const config: HardhatIgnitionConfig = {
  privateKeys: [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
  ],
  mnemonic: 'test test test test test test test test test test test junk',
  hdPath: "m/44'/60'/0'/0",
  networks: {
    'local': {
      networkId: '31337',
      rpcProvider: 'http://localhost:8545',
      privateKeys: [
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
      ],
      mnemonic: 'test test test test test test test test test test test junk',
      hdPath: "m/44'/60'/0'/0",
      localDeployment: true,
      deploymentFilePath: './deployment/tornado.module.ts',
      blockConfirmation: 1,
    },
    'kovan': {
      networkId: '42',
      rpcProvider: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      privateKeys: [
        PRIVATE_KEY as string,
      ],
      localDeployment: false,
      deploymentFilePath: './deployment/module.ts',
      blockConfirmation: 4,
    }
  },
  params: {
    MERKLE_TREE_HEIGHT: '20',
    ERC20_TOKEN: '',
    ETH_AMOUNT: '100000000000000000',
    TOKEN_AMOUNT: '100000000000000000'
  }
};
