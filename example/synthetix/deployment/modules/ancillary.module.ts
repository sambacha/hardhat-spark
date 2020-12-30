import { module, ModuleBuilder } from '../../../../src/interfaces/mortar';
import { useOvm } from './core.module';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import path from 'path';
import { SynthetixCore } from './core.module';
require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

const {
  ETH_ADDRESS,
} = process.env;

export const SynthetixAncillary = module('SynthetixAncillary', async (m: ModuleBuilder) => {
  const libraries = await SynthetixLibraries;
  const prototypes = await SynthetixPrototypes;
  const core = await SynthetixCore;
  await m.bindModules(libraries, prototypes, core);

  const ReadProxyAddressResolver = m.getBinding('ReadProxyAddressResolver');
  m.contract('Depot', ETH_ADDRESS, ETH_ADDRESS, ReadProxyAddressResolver);

  if (useOvm) {
    m.bindPrototype('EtherCollateral', 'EmptyEtherCollateral');
    m.bindPrototype('EtherCollateralsUSD', 'EmptyEtherCollateral');
    m.contract('SynthetixBridgeToBase', ETH_ADDRESS, ReadProxyAddressResolver);
  } else {
    m.contract('EtherCollateral', ETH_ADDRESS, ReadProxyAddressResolver);
    m.contract('EtherCollateralsUSD', ETH_ADDRESS, ReadProxyAddressResolver);
    m.contract('SynthetixBridgeToOptimism', ETH_ADDRESS, ReadProxyAddressResolver);
  }

  m.contract('BinaryOptionMarketFactory', ETH_ADDRESS, ReadProxyAddressResolver);
});
