import '../../src/packages/hardhat_plugin';
// @ts-ignore
import { config } from './mortar.config';

const mortarJsonConfig = require('./mortar-config.json');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.7.3',
  mortar: {
    mortarConfig: config,
    config: mortarJsonConfig
  }
};
