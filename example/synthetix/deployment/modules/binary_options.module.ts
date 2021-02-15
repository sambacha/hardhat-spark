import { buildModule } from '../../../../src/interfaces/mortar';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';

export const BinaryOptionsModule = buildModule('BinaryOptionsModule', async (m: SynthetixModuleBuilder) => {
  m.contract(
    'BinaryOptionMarketManager',
    m.ETH_ADDRESS,
    m.ReadProxyAddressResolver,
    m.maxOraclePriceAge,
    m.expiryDuration,
    m.maxTimeToMaturity,
    m.creatorCapitalRequirement,
    m.creatorSkewLimit,
    m.poolFee,
    m.creatorFee,
    m.refundFee
  );
});
