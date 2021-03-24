import {
  buildModule,
  ModuleConfig
} from '../../../src';
import { SynthetixLibraries, SynthetixPrototypes } from './modules/helper.module';
import { SynthetixCore } from './modules/core.module';
import { BinaryOptionsModule } from './modules/binary_options.module';
import { DappUtilities } from './modules/dapp_utilities.module';
import { SynthetixSynths } from './modules/synths.module';
import { SynthetixAncillary } from './modules/ancillary.module';
import { SynthetixInverseSynths } from './modules/inverse_synthes.module';
import { SynthetixRebuildCache } from './modules/rebuild_cache_module.module';
import { SystemSettingsModule } from './modules/system_setting_setup.module';
import { SynthetixIssuerSetup } from './modules/issuer_setup.module';
import { SynthetixDebtCacheSetup } from './modules/debt_cache_setup.module';
import { SynthetixModuleBuilder } from './SynthetixModule';

const moduleConfig = require('./local/config.json') as ModuleConfig;

export const SynthetixModule = buildModule('SynthetixModule', async (m: SynthetixModuleBuilder) => {
  await m.module(SynthetixLibraries);
  await m.module(SynthetixPrototypes);

  await m.module(SynthetixCore);

  await m.module(SynthetixSynths);
  await m.module(BinaryOptionsModule);
  await m.module(DappUtilities);
  await m.module(SynthetixAncillary);
  await m.module(SynthetixInverseSynths);
  await m.module(SynthetixRebuildCache);
  await m.module(SystemSettingsModule);
  await m.module(SynthetixIssuerSetup);
  await m.module(SynthetixDebtCacheSetup);

  // @TODO validate once again if some synthetix functionality is missing
}, moduleConfig);
