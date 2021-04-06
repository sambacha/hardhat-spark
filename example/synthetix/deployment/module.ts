import {
  buildModule,
  ModuleConfig
} from '@tenderly/hardhat-ignition';
import { SynthetixLibraries, SynthetixTemplates } from './modules/helper.module';
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
  await m.useModule(SynthetixLibraries);
  await m.useModule(SynthetixTemplates);

  await m.useModule(SynthetixCore);

  await m.useModule(SynthetixSynths);
  await m.useModule(BinaryOptionsModule);
  await m.useModule(DappUtilities);
  await m.useModule(SynthetixAncillary);
  await m.useModule(SynthetixInverseSynths);
  await m.useModule(SynthetixRebuildCache);
  await m.useModule(SystemSettingsModule);
  await m.useModule(SynthetixIssuerSetup);
  await m.useModule(SynthetixDebtCacheSetup);

  // @TODO validate once again if some synthetix functionality is missing
}, moduleConfig);
