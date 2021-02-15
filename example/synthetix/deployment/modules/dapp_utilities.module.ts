import { buildModule } from '../../../../src/interfaces/mortar';
import path from 'path';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';
require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

export const DappUtilities = buildModule('DappUtilities', async (m: SynthetixModuleBuilder) => {
  const ReadProxyAddressResolver = m.ReadProxyAddressResolver;

  m.contract('SynthUtil', ReadProxyAddressResolver);
  m.contract('DappMaintenance', m.ETH_ADDRESS);
  m.contract('BinaryOptionMarketData');
});
