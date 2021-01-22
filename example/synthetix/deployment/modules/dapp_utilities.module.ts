import { module } from '../../../../src/interfaces/mortar';
import path from 'path';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';
require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

const {
  ETH_ADDRESS,
} = process.env;

export const DappUtilities = module('DappUtilities', async (m: SynthetixModuleBuilder) => {
  const ReadProxyAddressResolver = m.ReadProxyAddressResolver;

  m.contract('SynthUtil', ReadProxyAddressResolver);
  m.contract('DappMaintenance', ETH_ADDRESS);
  m.contract('BinaryOptionMarketData');
});
