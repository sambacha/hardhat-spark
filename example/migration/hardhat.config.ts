import 'hardhat-deploy';
import '../../src/hardhat';
// @ts-ignore
import { config } from './hardhat-ignition.config';

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.5.2',
  namedAccounts: {
    deployer: {
      default: 0,
    }
  },
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ['local'],
    }
  },
  ignition: config
};
