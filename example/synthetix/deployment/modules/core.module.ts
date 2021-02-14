import { module } from '../../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import { toBytes32 } from '../../util/util';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import { mutator } from '../../../../src/interfaces/helper/macros';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';


export const SynthetixCore = module('SynthetixCore', async (m: SynthetixModuleBuilder) => {
  await m.module(SynthetixLibraries);
  await m.module(SynthetixPrototypes);

  const AddressResolver = m.contract('AddressResolver', m.ETH_ADDRESS);
  const ReadProxyAddressResolver = m.bindPrototype('ReadProxyAddressResolver', 'ReadProxy', m.ETH_ADDRESS);

  mutator(m,
    ReadProxyAddressResolver,
    'setTarget',
    [AddressResolver],
  );

  m.contract('FlexibleStorage', ReadProxyAddressResolver);
  m.contract('SystemSettings', m.ETH_ADDRESS, ReadProxyAddressResolver);
  const SystemStatus = m.contract('SystemStatus', m.ETH_ADDRESS);
  m.contract('ExchangeRates', m.ETH_ADDRESS, m.oracleExRatesContractAddress, ReadProxyAddressResolver, [], []);

  const RewardEscrow = m.contract('RewardEscrow', m.ETH_ADDRESS, ethers.constants.AddressZero, ethers.constants.AddressZero);
  const SynthetixEscrow = m.contract('SynthetixEscrow', m.ETH_ADDRESS, ethers.constants.AddressZero);
  const SynthetixState = m.contract('SynthetixState', m.ETH_ADDRESS, m.ETH_ADDRESS);

  const ProxyFeePool = m.bindPrototype('ProxyFeePool', 'Proxy', m.ETH_ADDRESS);

  const DelegateApprovalsEternalStorage = m.bindPrototype('DelegateApprovalsEternalStorage', 'EternalStorage', m.ETH_ADDRESS, ethers.constants.AddressZero);
  const DelegateApprovals = m.contract('DelegateApprovals', m.ETH_ADDRESS, DelegateApprovalsEternalStorage);

  mutator(m,
    DelegateApprovalsEternalStorage,
    'setAssociatedContract',
    [DelegateApprovals],
  );

  const Liquidations = m.contract('Liquidations', m.ETH_ADDRESS, ReadProxyAddressResolver);
  const EternalStorageLiquidations = m.bindPrototype('EternalStorageLiquidations', 'EternalStorage', m.ETH_ADDRESS, Liquidations);

  mutator(m,
    EternalStorageLiquidations,
    'setAssociatedContract',
    [Liquidations],
  );

  const FeePoolEternalStorage = m.contract('FeePoolEternalStorage', m.ETH_ADDRESS, ethers.constants.AddressZero);
  const FeePool = m.contract('FeePool', ProxyFeePool, AddressResolver, ReadProxyAddressResolver);

  mutator(m,
    FeePoolEternalStorage,
    'setAssociatedContract',
    [FeePool],
  );

  mutator(m,
    ProxyFeePool,
    'setTarget',
    [FeePool],
  );

  const FeePoolState = m.contract('FeePoolState', m.ETH_ADDRESS, FeePool);

  mutator(m,
    FeePoolState,
    'setFeePool',
    [FeePool],
  );

  const RewardsDistribution = m.contract(
    'RewardsDistribution',
    m.ETH_ADDRESS,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    RewardEscrow,
    ProxyFeePool
  );

  const ProxyERC20Synthetix = m.bindPrototype('ProxyERC20Synthetix', 'ProxyERC20', m.ETH_ADDRESS);
  const TokenStateSynthetix = m.bindPrototype('TokenStateSynthetix', 'TokenState', m.ETH_ADDRESS, m.ETH_ADDRESS);

  const synthetix = m.bindPrototype(
    'Synthetix',
    m.useOvm ? 'MintableSynthetix' : 'Synthetix',
    ProxyERC20Synthetix,
    TokenStateSynthetix,
    m.ETH_ADDRESS,
    m.currentSynthetixSupply,
    ReadProxyAddressResolver
  );

  mutator(m,
    ProxyERC20Synthetix,
    'setTarget',
    [synthetix],
  );

  mutator(m,
    synthetix,
    'setProxy',
    [ProxyERC20Synthetix],
  );

  const ProxySynthetix = m.bindPrototype('ProxySynthetix', 'Proxy', m.ETH_ADDRESS);

  mutator(m,
    ProxySynthetix,
    'setTarget',
    [synthetix],
  );

  m.bindPrototype(
    'DebtCache',
    m.useOvm ? 'RealtimeDebtCache' : 'DebtCache',
    m.ETH_ADDRESS,
    ReadProxyAddressResolver
  );

  const exchanger = m.bindPrototype(
    'Exchanger',
    m.useOvm ? 'Exchanger' : 'ExchangerWithVirtualSynth',
    m.ETH_ADDRESS,
    ReadProxyAddressResolver
  );
  const exchangeState = m.contract('ExchangeState', m.ETH_ADDRESS, exchanger);

  mutator(m,
    exchangeState,
    'setAssociatedContract',
    [exchanger],
  );

  mutator(m,
    SystemStatus,
    'updateAccessControl',
    [toBytes32('Synth'), exchanger, true, false],
    {
      getterFunc: 'accessControl',
      getterArgs: [toBytes32('Synth'), exchanger],
      expectedValue: [true, false],
    }
  );

  mutator(m,
    TokenStateSynthetix,
    'setBalanceOf',
    [m.ETH_ADDRESS, m.currentSynthetixSupply],
  );

  mutator(m,
    TokenStateSynthetix,
    'setAssociatedContract',
    [synthetix],
  );

  const issuer = m.bindPrototype('Issuer',
    m.useOvm ? 'Issuer' : 'IssuerWithoutLiquidations',
    m.ETH_ADDRESS,
    ReadProxyAddressResolver
  );

  m.contract('TradingRewards', m.ETH_ADDRESS, m.ETH_ADDRESS, ReadProxyAddressResolver);


  mutator(m,
    SynthetixState,
    'setAssociatedContract',
    [issuer],
  );

  m.contract('EscrowChecker', SynthetixEscrow);

  mutator(m,
    RewardEscrow,
    'setSynthetix',
    [synthetix],
  );

  mutator(m,
    RewardEscrow,
    'setFeePool',
    [FeePool],
  );

  if (m.useOvm) {
    m.bindPrototype('SupplySchedule', 'FixedSupplySchedule',
      m.ETH_ADDRESS,
      ReadProxyAddressResolver,
      m.inflationStartDate,
      '0',
      '0',
      m.mintPeriod,
      m.mintBuffer,
      m.fixedPeriodicSupply,
      m.supplyEnd,
      m.minterReward,
    );
  } else {
    const supplySchedule = m.contract('SupplySchedule', m.ETH_ADDRESS, m.currentLastMintEvent, m.currentWeekOfInflation);

    mutator(m,
      supplySchedule,
      'setSynthetixProxy',
      [synthetix],
    );
  }

  mutator(m,
    RewardsDistribution,
    'setAuthority',
    [synthetix],
  );

  mutator(m,
    RewardsDistribution,
    'setSynthetixProxy',
    [ProxyERC20Synthetix],
  );

  mutator(m,
    SynthetixEscrow,
    'setSynthetix',
    [synthetix],
  );
});
