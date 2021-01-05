import { module } from '../../../../src/interfaces/mortar';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import path from 'path';
import { SynthetixCore } from './core.module';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';
require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

const {
  ETH_ADDRESS,
} = process.env;

export const DappUtilities = module('DappUtilities', async (m: SynthetixModuleBuilder) => {
  await m.bindModule(SynthetixLibraries);
  await m.bindModule(SynthetixPrototypes);
  await m.bindModule(SynthetixCore);

  const ReadProxyAddressResolver = m.ReadProxyAddressResolver;

  m.contract('SynthUtil', ReadProxyAddressResolver);
  m.contract('DappMaintenance', ETH_ADDRESS);
  m.contract('BinaryOptionMarketData');
});
