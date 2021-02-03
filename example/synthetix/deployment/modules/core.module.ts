import { module, ModuleBuilder } from '../../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import { toBytes32 } from '../../util/util';
import * as web3utils from 'web3-utils';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import path from 'path';
import { mutator } from '../../../../src/interfaces/helper/macros';

require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

const {
  ETH_ADDRESS
} = process.env;

export const oracleExRatesContractAddress = ETH_ADDRESS;
export const useOvm = false;
export const currentSynthetixSupply = ethers.BigNumber.from('100000');
export const currentWeekOfInflation = 0;
export const currentLastMintEvent = 0;

export const SynthetixCore = module('SynthetixCore', async (m: ModuleBuilder) => {
  await m.module(SynthetixLibraries);
  await m.module(SynthetixPrototypes);

  const AddressResolver = m.contract('AddressResolver', ETH_ADDRESS);
  const ReadProxyAddressResolver = m.bindPrototype('ReadProxyAddressResolver', 'ReadProxy', ETH_ADDRESS);

  await mutator(m,
    'setTargetInResolverFromReadProxy',
    ReadProxyAddressResolver,
    'setTarget',
    'target',
    [AddressResolver],
    [],
    AddressResolver,
  );

  m.contract('FlexibleStorage', ReadProxyAddressResolver);
  m.contract('SystemSettings', ETH_ADDRESS, ReadProxyAddressResolver);
  const SystemStatus = m.contract('SystemStatus', ETH_ADDRESS);
  m.contract('ExchangeRates', ETH_ADDRESS, oracleExRatesContractAddress, ReadProxyAddressResolver, [], []);

  const RewardEscrow = m.contract('RewardEscrow', ETH_ADDRESS, ethers.constants.AddressZero, ethers.constants.AddressZero);
  const SynthetixEscrow = m.contract('SynthetixEscrow', ETH_ADDRESS, ethers.constants.AddressZero);
  const SynthetixState = m.contract('SynthetixState', ETH_ADDRESS, ETH_ADDRESS);

  const ProxyFeePool = m.bindPrototype('ProxyFeePool', 'Proxy', ETH_ADDRESS);

  const DelegateApprovalsEternalStorage = m.bindPrototype('DelegateApprovalsEternalStorage', 'EternalStorage', ETH_ADDRESS, ethers.constants.AddressZero);
  const DelegateApprovals = m.contract('DelegateApprovals', ETH_ADDRESS, DelegateApprovalsEternalStorage);

  await mutator(m,
    'afterDeployDelegateApprovalsEternalStorage',
    DelegateApprovalsEternalStorage,
    'setAssociatedContract',
    'associatedContract',
    [DelegateApprovals],
    [],
    DelegateApprovals,
  );

  const Liquidations = m.contract('Liquidations', ETH_ADDRESS, ReadProxyAddressResolver);
  const EternalStorageLiquidations = m.bindPrototype('EternalStorageLiquidations', 'EternalStorage', ETH_ADDRESS, Liquidations);

  await mutator(m,
    'afterDeployEternalStorageLiquidations',
    EternalStorageLiquidations,
    'setAssociatedContract',
    'associatedContract',
    [Liquidations],
    [],
    Liquidations
  );

  const FeePoolEternalStorage = m.contract('FeePoolEternalStorage', ETH_ADDRESS, ethers.constants.AddressZero);
  const FeePool = m.contract('FeePool', ProxyFeePool, AddressResolver, ReadProxyAddressResolver);

  await mutator(m,
    'afterDeployFeePoolEternalStorage',
    FeePoolEternalStorage,
    'setAssociatedContract',
    'associatedContract',
    [FeePool],
    [],
    FeePool,
  );

  await mutator(m,
    'afterDeployFeePool',
    ProxyFeePool,
    'setTarget',
    'target',
    [FeePool],
    [],
    FeePool,
  );

  const FeePoolState = m.contract('FeePoolState', ETH_ADDRESS, FeePool);

  await mutator(m,
    'afterDeployFeePoolState',
    FeePoolState,
    'setFeePool',
    'feePool',
    [FeePool],
    [],
    FeePool,
  );

  const RewardsDistribution = m.contract(
    'RewardsDistribution',
    ETH_ADDRESS,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    RewardEscrow,
    ProxyFeePool
  );

  const ProxyERC20Synthetix = m.bindPrototype('ProxyERC20Synthetix', 'ProxyERC20', ETH_ADDRESS);
  const TokenStateSynthetix = m.bindPrototype('TokenStateSynthetix', 'TokenState', ETH_ADDRESS, ETH_ADDRESS);

  const synthetix = m.bindPrototype(
    'Synthetix',
    useOvm ? 'MintableSynthetix' : 'Synthetix',
    ProxyERC20Synthetix,
    TokenStateSynthetix,
    ETH_ADDRESS,
    currentSynthetixSupply,
    ReadProxyAddressResolver
  );

  await mutator(m,
    'afterDeploySynthetixProxyERC20Synthetix',
    ProxyERC20Synthetix,
    'setTarget',
    'target',
    [synthetix],
    [],
    synthetix,
  );

  await mutator(m,
    'afterDeployProxyERC20SynthetixSynthetix',
    synthetix,
    'setProxy',
    'proxy',
    [ProxyERC20Synthetix],
    [],
    ProxyERC20Synthetix,
  );

  const ProxySynthetix = m.bindPrototype('ProxySynthetix', 'Proxy', ETH_ADDRESS);

  await mutator(m,
    'afterDeployProxySynthetix',
    ProxySynthetix,
    'setTarget',
    'target',
    [synthetix],
    [],
    synthetix,
  );

  m.bindPrototype(
    'DebtCache',
    useOvm ? 'RealtimeDebtCache' : 'DebtCache',
    ETH_ADDRESS,
    ReadProxyAddressResolver
  );

  const exchanger = m.bindPrototype(
    'Exchanger',
    useOvm ? 'Exchanger' : 'ExchangerWithVirtualSynth',
    ETH_ADDRESS,
    ReadProxyAddressResolver
  );
  const exchangeState = m.contract('ExchangeState', ETH_ADDRESS, exchanger);

  await mutator(m,
    'afterDeployExchangeState',
    exchangeState,
    'setAssociatedContract',
    'associatedContract',
    [exchanger],
    [],
    exchanger,
  );

  await mutator(m,
    'afterDeployExchanger',
    SystemStatus,
    'updateAccessControl',
    'accessControl',
    [toBytes32('Synth'), exchanger, true, false],
    [toBytes32('Synth'), exchanger],
    [true, false],
  );

  await mutator(m,
    'afterDeployTokenStateSynthetix',
    TokenStateSynthetix,
    'setBalanceOf',
    'balanceOf',
    [ETH_ADDRESS, currentSynthetixSupply],
    [ETH_ADDRESS],
    currentSynthetixSupply,
  );

  await mutator(m,
    'afterDeployTokenStateSynthetixAndSynthetix',
    TokenStateSynthetix,
    'setAssociatedContract',
    'associatedContract',
    [synthetix],
    [],
    synthetix,
  );

  const issuer = m.bindPrototype('Issuer',
    useOvm ? 'Issuer' : 'IssuerWithoutLiquidations',
    ETH_ADDRESS,
    ReadProxyAddressResolver
  );

  m.contract('TradingRewards', ETH_ADDRESS, ETH_ADDRESS, ReadProxyAddressResolver);


  await mutator(m,
    'afterDeployIssueSynthetixState',
    SynthetixState,
    'setAssociatedContract',
    'associatedContract',
    [issuer],
    [],
    issuer,
  );

  m.contract('EscrowChecker', SynthetixEscrow);

  await mutator(m,
    'afterDeployRewardEscrowSynthetics',
    RewardEscrow,
    'setSynthetix',
    'synthetix',
    [synthetix],
    [],
    synthetix,
  );

  await mutator(m,
    'afterDeployRewardEscrowFeePool',
    RewardEscrow,
    'setFeePool',
    'feePool',
    [FeePool],
    [],
    FeePool,
  );

  if (useOvm) {
    const inflationStartDate = (Math.round(new Date().getTime() / 1000) - 3600 * 24 * 7).toString(); // 1 week ago
    const fixedPeriodicSupply = web3utils.toWei('50000');
    const mintPeriod = (3600 * 24 * 7).toString(); // 1 week
    const mintBuffer = '600'; // 10 minutes
    const minterReward = web3utils.toWei('100');
    const supplyEnd = '5'; // allow 4 mints in total

    m.bindPrototype('SupplySchedule', 'FixedSupplySchedule',
      ETH_ADDRESS,
      ReadProxyAddressResolver,
      inflationStartDate,
      '0',
      '0',
      mintPeriod,
      mintBuffer,
      fixedPeriodicSupply,
      supplyEnd,
      minterReward,
    );
  } else {
    const supplySchedule = m.contract('SupplySchedule', ETH_ADDRESS, currentLastMintEvent, currentWeekOfInflation);

    await mutator(m,
      'afterDeploySupplySchedule',
      supplySchedule,
      'setSynthetixProxy',
      'synthetixProxy',
      [synthetix],
      [],
      synthetix,
    );
  }

  await mutator(m,
    'afterDeployRewardDistribution',
    RewardsDistribution,
    'setAuthority',
    'authority',
    [synthetix],
    [],
    synthetix,
  );

  await mutator(m,
    'afterDeployRewardDistributionProxySynthetix',
    RewardsDistribution,
    'setSynthetixProxy',
    'synthetixProxy',
    [ProxyERC20Synthetix],
    [],
    ProxyERC20Synthetix,
  );

  await mutator(m,
    'afterDeploySynthetixEscrow',
    SynthetixEscrow,
    'setSynthetix',
    'synthetix',
    [synthetix],
    [],
    synthetix,
  );
});
