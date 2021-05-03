import { buildModule, sendAfterDeploy, ModuleBuilder } from '@tenderly/hardhat-ignition';
import { ethers } from 'ethers';
import { toBytes32 } from '../../util/util';

export const SynthetixCore = buildModule('SynthetixCore', async (m: ModuleBuilder) => {
  const AddressResolver = m.contract('AddressResolver', m.ETH_ADDRESS);
  const ReadProxyAddressResolver = m.bindTemplate('ReadProxyAddressResolver', 'ReadProxy', m.ETH_ADDRESS);

  sendAfterDeploy(m,
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

  const ProxyFeePool = m.bindTemplate('ProxyFeePool', 'Proxy', m.ETH_ADDRESS);

  const DelegateApprovalsEternalStorage = m.bindTemplate('DelegateApprovalsEternalStorage', 'EternalStorage', m.ETH_ADDRESS, ethers.constants.AddressZero);
  const DelegateApprovals = m.contract('DelegateApprovals', m.ETH_ADDRESS, DelegateApprovalsEternalStorage);

  sendAfterDeploy(m,
    DelegateApprovalsEternalStorage,
    'setAssociatedContract',
    [DelegateApprovals],
  );

  const Liquidations = m.contract('Liquidations', m.ETH_ADDRESS, ReadProxyAddressResolver);
  const EternalStorageLiquidations = m.bindTemplate('EternalStorageLiquidations', 'EternalStorage', m.ETH_ADDRESS, Liquidations);

  sendAfterDeploy(m,
    EternalStorageLiquidations,
    'setAssociatedContract',
    [Liquidations],
  );

  const FeePoolEternalStorage = m.contract('FeePoolEternalStorage', m.ETH_ADDRESS, ethers.constants.AddressZero);
  const FeePool = m.contract('FeePool', ProxyFeePool, AddressResolver, ReadProxyAddressResolver);

  sendAfterDeploy(m,
    FeePoolEternalStorage,
    'setAssociatedContract',
    [FeePool],
  );

  sendAfterDeploy(m,
    ProxyFeePool,
    'setTarget',
    [FeePool],
  );

  const FeePoolState = m.contract('FeePoolState', m.ETH_ADDRESS, FeePool);

  sendAfterDeploy(m,
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

  const ProxyERC20Synthetix = m.bindTemplate('ProxyERC20Synthetix', 'ProxyERC20', m.ETH_ADDRESS);
  const TokenStateSynthetix = m.bindTemplate('TokenStateSynthetix', 'TokenState', m.ETH_ADDRESS, m.ETH_ADDRESS);

  const synthetix = m.bindTemplate(
    'Synthetix',
    m.useOvm ? 'MintableSynthetix' : 'Synthetix',
    ProxyERC20Synthetix,
    TokenStateSynthetix,
    m.ETH_ADDRESS,
    m.currentSynthetixSupply,
    ReadProxyAddressResolver
  );

  sendAfterDeploy(m,
    ProxyERC20Synthetix,
    'setTarget',
    [synthetix],
  );

  sendAfterDeploy(m,
    synthetix,
    'setProxy',
    [ProxyERC20Synthetix],
  );

  const ProxySynthetix = m.bindTemplate('ProxySynthetix', 'Proxy', m.ETH_ADDRESS);

  sendAfterDeploy(m,
    ProxySynthetix,
    'setTarget',
    [synthetix],
  );

  m.bindTemplate(
    'DebtCache',
    m.useOvm ? 'RealtimeDebtCache' : 'DebtCache',
    m.ETH_ADDRESS,
    ReadProxyAddressResolver
  );

  const exchanger = m.bindTemplate(
    'Exchanger',
    m.useOvm ? 'Exchanger' : 'ExchangerWithVirtualSynth',
    m.ETH_ADDRESS,
    ReadProxyAddressResolver
  );
  const exchangeState = m.contract('ExchangeState', m.ETH_ADDRESS, exchanger);

  sendAfterDeploy(m,
    exchangeState,
    'setAssociatedContract',
    [exchanger],
  );

  sendAfterDeploy(m,
    SystemStatus,
    'updateAccessControl',
    [toBytes32('Synth'), exchanger, true, false],
    {
      getterFunc: 'accessControl',
      getterArgs: [toBytes32('Synth'), exchanger],
      expectedValue: [true, false],
    }
  );

  sendAfterDeploy(m,
    TokenStateSynthetix,
    'setBalanceOf',
    [m.ETH_ADDRESS, m.currentSynthetixSupply],
  );

  sendAfterDeploy(m,
    TokenStateSynthetix,
    'setAssociatedContract',
    [synthetix],
  );

  const issuer = m.bindTemplate('Issuer',
    m.useOvm ? 'Issuer' : 'IssuerWithoutLiquidations',
    m.ETH_ADDRESS,
    ReadProxyAddressResolver
  );

  m.contract('TradingRewards', m.ETH_ADDRESS, m.ETH_ADDRESS, ReadProxyAddressResolver);


  sendAfterDeploy(m,
    SynthetixState,
    'setAssociatedContract',
    [issuer],
  );

  m.contract('EscrowChecker', SynthetixEscrow);

  sendAfterDeploy(m,
    RewardEscrow,
    'setSynthetix',
    [synthetix],
  );

  sendAfterDeploy(m,
    RewardEscrow,
    'setFeePool',
    [FeePool],
  );

  if (m.useOvm) {
    m.bindTemplate('SupplySchedule', 'FixedSupplySchedule',
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

    sendAfterDeploy(m,
      supplySchedule,
      'setSynthetixProxy',
      [synthetix],
    );
  }

  sendAfterDeploy(m,
    RewardsDistribution,
    'setAuthority',
    [synthetix],
  );

  sendAfterDeploy(m,
    RewardsDistribution,
    'setSynthetixProxy',
    [ProxyERC20Synthetix],
  );

  sendAfterDeploy(m,
    SynthetixEscrow,
    'setSynthetix',
    [synthetix],
  );
});
