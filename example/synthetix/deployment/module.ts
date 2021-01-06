import {
  module,
  ModuleConfig
} from '../../../src/interfaces/mortar';
import { SynthetixLibraries, SynthetixPrototypes } from './modules/helper.module';
import { SynthetixCore } from './modules/core.module';
import { BinaryOptionsModule } from './modules/binary_options.module';
import { DappUtilities } from './modules/dapp_utilities.module';
import { SynthetixSynths } from './modules/synths.module';
import { SynthetixAncillary } from './modules/ancillary.module';
import { SynthetixInverseSynths } from './modules/inverse_synthes.module';
import { SynthetixRebuildCache } from './modules/rebuild_cache_module.module';
import { SystemSettingsModule } from './modules/system_setting_setup.module';
import { SynthetixModuleBuilder } from '../.mortar/SynthetixModule/SynthetixModule';
import { SynthetixIssuerSetup } from './modules/issuer_setup.module';
import { SynthetixDebtCacheSetup } from './modules/debt_cache_setup.module';

const moduleConfig = require('./local/config.json') as ModuleConfig;

export const SynthetixModule = module('SynthetixModule', async (m: SynthetixModuleBuilder) => {
  await m.bindModule(SynthetixLibraries);
  await m.bindModule(SynthetixPrototypes);

  await m.bindModule(SynthetixCore);

  await m.bindModule(SynthetixSynths);
  await m.bindModule(BinaryOptionsModule);
  await m.bindModule(DappUtilities);
  await m.bindModule(SynthetixAncillary);
  await m.bindModule(SynthetixInverseSynths);
  await m.bindModule(SynthetixRebuildCache);
  await m.bindModule(SystemSettingsModule);
  await m.bindModule(SynthetixIssuerSetup);
  await m.bindModule(SynthetixDebtCacheSetup);

  // @TODO validate once again if some synthetix functionality is missing
}, moduleConfig);
