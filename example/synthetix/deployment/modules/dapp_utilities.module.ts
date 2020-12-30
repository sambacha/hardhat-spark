import { module, ModuleBuilder } from '../../../../src/interfaces/mortar';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import path from 'path';
import { SynthetixCore } from './core.module';
require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

const {
  ETH_ADDRESS,
} = process.env;

export const DappUtilities = module('DappUtilities', async (m: ModuleBuilder) => {
  const libraries = await SynthetixLibraries;
  const prototypes = await SynthetixPrototypes;
  const core = await SynthetixCore;
  await m.bindModules(libraries, prototypes, core);

  const ReadProxyAddressResolver = m.getBinding('ReadProxyAddressResolver');

  m.contract('SynthUtil', ReadProxyAddressResolver);
  m.contract('DappMaintenance', ETH_ADDRESS);
  m.contract('BinaryOptionMarketData');
});
