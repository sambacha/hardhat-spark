import 'ignition-hardhat-plugin';
// @ts-ignoreog(
import { config } from './hardhat-ignition.config';

const {
  INFURA_KEY,
  PRIVATE_KEY
} = process.env;


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.7.3',
  networks: {
    'local': {
      chainId: 31337,
      url: 'http://localhost:8545',
      blockConfirmation: 1,
      accounts: [
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
      ],
    },
    'kovan': {
      url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      blockConfirmation: 2,
    }
  },
  ignition: {
    blockConfirmation: 1,
    moduleParams: {}
  }
};
