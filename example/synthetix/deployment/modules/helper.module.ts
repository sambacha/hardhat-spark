import { buildModule, ModuleBuilder } from 'ignition-core';

export const SynthetixLibraries = buildModule('SynthetixLibraries', async (m: ModuleBuilder) => {
  m.library('SafeDecimalMath');
  m.library('Math');
});

export const SynthetixTemplates = buildModule('SynthetixTemplates', async (m: ModuleBuilder) => {
  m.contractTemplate('ReadProxy');
  m.contractTemplate('Proxy');
  m.contractTemplate('EternalStorage');
  m.contractTemplate('ProxyERC20');
  m.contractTemplate('TokenState');
  m.contractTemplate('MintableSynthetix');
  m.contractTemplate('Synthetix');
  m.contractTemplate('RealtimeDebtCache');
  m.contractTemplate('DebtCache');
  m.contractTemplate('Exchanger');
  m.contractTemplate('ExchangerWithVirtualSynth');
  m.contractTemplate('IssuerWithoutLiquidations');
  m.contractTemplate('Issuer');
  m.contractTemplate('FixedSupplySchedule');
  m.contractTemplate('Synth');
  m.contractTemplate('PurgeableSynth');
  m.contractTemplate('MultiCollateralSynth');
  m.contractTemplate('EmptyEtherCollateral');
});
