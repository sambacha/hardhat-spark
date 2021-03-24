import '../../src/hardhat';
// @ts-ignore
import { config } from './hardhat-ignition.config';

const ignitionJsonConfig = require('./hardhat-ignition-config.json');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.7.3',
  ignition: {
    ignitionConfig: config,
    config: ignitionJsonConfig
  }
};
