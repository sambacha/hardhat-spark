import path from 'path';
import { ethers } from 'ethers';

import('ignition-hardhat-plugin');

require('dotenv').config({path: path.resolve(__dirname + '/.env')});

const {
  PRIVATE_KEY,
  INFURA_KEY,
} = process.env;
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.8.0',
  networks: {
    kovan: {
      chainId: 42,
      url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      accounts: [
        PRIVATE_KEY as string,
      ],
      localDeployment: false,
      blockConfirmation: 2,
      gasPriceBackoff: {
        maxGasPrice: ethers.utils.parseUnits('100', 'gwei'),
        backoffTime: 1000 * 3,
        numberOfRetries: 3,
      }
    }
  }
};
