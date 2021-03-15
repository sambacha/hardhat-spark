import '../../src/hardhat';
// @ts-ignore
import { config } from './ignition.config';

const ignitionJsonConfig = require('./ignition-config.json');

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
