import '@tenderly/hardhat-ignition/src/hardhat';
// @ts-ignore
import { config } from './hardhat-ignition.config';

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.7.3',
  ignition: config
};
