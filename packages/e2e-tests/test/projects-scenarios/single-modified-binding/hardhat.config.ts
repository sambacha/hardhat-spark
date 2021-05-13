import 'ignition-hardhat-plugin';
import { config } from './hardhat-ignition.config';

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.7.3',
  ignition: config,
};
