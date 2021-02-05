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

  mutator(m,
    ReadProxyAddressResolver,
    'setTarget',
    [AddressResolver],
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

  mutator(m,
    DelegateApprovalsEternalStorage,
    'setAssociatedContract',
    [DelegateApprovals],
  );

  const Liquidations = m.contract('Liquidations', ETH_ADDRESS, ReadProxyAddressResolver);
  const EternalStorageLiquidations = m.bindPrototype('EternalStorageLiquidations', 'EternalStorage', ETH_ADDRESS, Liquidations);

  mutator(m,
    EternalStorageLiquidations,
    'setAssociatedContract',
    [Liquidations],
  );

  const FeePoolEternalStorage = m.contract('FeePoolEternalStorage', ETH_ADDRESS, ethers.constants.AddressZero);
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

  const FeePoolState = m.contract('FeePoolState', ETH_ADDRESS, FeePool);

  mutator(m,
    FeePoolState,
    'setFeePool',
    [FeePool],
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

  const ProxySynthetix = m.bindPrototype('ProxySynthetix', 'Proxy', ETH_ADDRESS);

  mutator(m,
    ProxySynthetix,
    'setTarget',
    [synthetix],
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
    [ETH_ADDRESS, currentSynthetixSupply],
  );

  mutator(m,
    TokenStateSynthetix,
    'setAssociatedContract',
    [synthetix],
  );

  const issuer = m.bindPrototype('Issuer',
    useOvm ? 'Issuer' : 'IssuerWithoutLiquidations',
    ETH_ADDRESS,
    ReadProxyAddressResolver
  );

  m.contract('TradingRewards', ETH_ADDRESS, ETH_ADDRESS, ReadProxyAddressResolver);


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
