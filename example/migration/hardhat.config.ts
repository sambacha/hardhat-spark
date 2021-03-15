import 'hardhat-deploy';
import '../../src/hardhat';
// @ts-ignore
import { config } from './ignition.config';
const ignitionJsonConfig = require('./ignition-config.json');

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
  ignition: {
    ignitionConfig: config,
    config: ignitionJsonConfig
  }
};
