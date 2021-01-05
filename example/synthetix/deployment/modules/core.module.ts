import { module, ModuleBuilder } from '../../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import { toBytes32 } from '../../util/util';
import * as web3utils from 'web3-utils';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import path from 'path';
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
  await m.bindModule(SynthetixLibraries);
  await m.bindModule(SynthetixPrototypes);

  const AddressResolver = m.contract('AddressResolver', ETH_ADDRESS);
  const ReadProxyAddressResolver = m.bindPrototype('ReadProxyAddressResolver', 'ReadProxy', ETH_ADDRESS);

  ReadProxyAddressResolver.afterDeploy(m, 'setTargetInResolverFromReadProxy', async (): Promise<void> => {
    await ReadProxyAddressResolver.instance().setTarget(AddressResolver);

    const target = await ReadProxyAddressResolver.instance().target() as string;
    if (target != AddressResolver?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, AddressResolver);

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

  m.group(DelegateApprovalsEternalStorage, DelegateApprovals).afterDeploy(m, 'afterDeployDelegateApprovalsEternalStorage', async (): Promise<void> => {
    await DelegateApprovalsEternalStorage.instance().setAssociatedContract(DelegateApprovals);

    const associatedContract = await DelegateApprovalsEternalStorage.instance().associatedContract() as string;
    if (associatedContract != DelegateApprovals?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  const Liquidations = m.contract('Liquidations', ETH_ADDRESS, ReadProxyAddressResolver);
  const EternalStorageLiquidations = m.bindPrototype('EternalStorageLiquidations', 'EternalStorage', ETH_ADDRESS, Liquidations);

  m.group(EternalStorageLiquidations, Liquidations).afterDeploy(m, 'afterDeployEternalStorageLiquidations', async (): Promise<void> => {
    await EternalStorageLiquidations.instance().setAssociatedContract(Liquidations);

    const associatedContract = await EternalStorageLiquidations.instance().associatedContract() as string;
    if (associatedContract != Liquidations?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  const FeePoolEternalStorage = m.contract('FeePoolEternalStorage', ETH_ADDRESS, ethers.constants.AddressZero);
  const FeePool = m.contract('FeePool', ProxyFeePool, AddressResolver, ReadProxyAddressResolver);

  m.group(FeePoolEternalStorage, FeePool).afterDeploy(m, 'afterDeployFeePoolEternalStorage', async (): Promise<void> => {
    await FeePoolEternalStorage.instance().setAssociatedContract(FeePool);

    const associatedContract = await FeePoolEternalStorage.instance().associatedContract() as string;
    if (associatedContract != FeePool?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  m.group(FeePool, ProxyFeePool).afterDeploy(m, 'afterDeployFeePool', async (): Promise<void> => {
    await ProxyFeePool.instance().setTarget(FeePool);

    const target = await ProxyFeePool.instance().target() as string;
    if (target != FeePool?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  const FeePoolState = m.contract('FeePoolState', ETH_ADDRESS, FeePool);

  m.group(FeePoolState, FeePool).afterDeploy(m, 'afterDeployFeePoolState', async (): Promise<void> => {
    await FeePoolState.instance().setFeePool(FeePool);

    const target = await FeePoolState.instance().feePool() as string;
    if (target != FeePool?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

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

  m.group(synthetix, ProxyERC20Synthetix).afterDeploy(m, 'afterDeploySynthetixProxyERC20Synthetix', async (): Promise<void> => {
    await ProxyERC20Synthetix.instance().setTarget(synthetix);

    const target = await ProxyERC20Synthetix.instance().target() as string;
    if (target != synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  m.group(synthetix, ProxyERC20Synthetix).afterDeploy(m, 'afterDeployProxyERC20SynthetixSynthetix', async (): Promise<void> => {
    await synthetix.instance().setProxy(ProxyERC20Synthetix);

    const target = await synthetix.instance().proxy() as string;
    if (target != ProxyERC20Synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  const ProxySynthetix = m.bindPrototype('ProxySynthetix', 'Proxy', ETH_ADDRESS);

  m.group(ProxySynthetix, synthetix).afterDeploy(m, 'afterDeployProxySynthetix', async (): Promise<void> => {
    await ProxySynthetix.instance().setTarget(synthetix);

    const target = await ProxySynthetix.instance().target() as string;
    if (target != synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

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

  m.group(exchangeState, exchanger).afterDeploy(m, 'afterDeployExchangeState', async (): Promise<void> => {
    await exchangeState.instance().setAssociatedContract(exchanger);

    const associatedContract = await exchangeState.instance().associatedContract() as string;
    if (associatedContract != exchanger?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  m.group(SystemStatus, exchanger).afterDeploy(m, 'afterDeployExchanger', async (): Promise<void> => {
    await SystemStatus.instance().updateAccessControl(
      toBytes32('Synth'),
      exchanger,
      true,
      false
    );

    const accessControl = await SystemStatus.instance().accessControl(
      toBytes32('Synth'),
      exchanger,
    );

    if (
      accessControl[0] != true &&
      accessControl[1] != false
    ) {
      throw new Error('Address mismatch');
    }
  });

  TokenStateSynthetix.afterDeploy(m, 'afterDeployTokenStateSynthetix', async (): Promise<void> => {
    await TokenStateSynthetix.instance().setBalanceOf(ETH_ADDRESS, currentSynthetixSupply);

    const balanceOf = await TokenStateSynthetix.instance().balanceOf(ETH_ADDRESS);
    if (!currentSynthetixSupply.eq(balanceOf)) {
      throw new Error('Address mismatch');
    }
  });

  m.group(TokenStateSynthetix, synthetix).afterDeploy(m, 'afterDeployTokenStateSynthetixAndSynthetix', async (): Promise<void> => {
    await TokenStateSynthetix.instance().setAssociatedContract(synthetix);

    const associatedContract = await TokenStateSynthetix.instance().associatedContract() as string;
    if (associatedContract != synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  const issuer = m.bindPrototype('Issuer',
    useOvm ? 'Issuer' : 'IssuerWithoutLiquidations',
    ETH_ADDRESS,
    ReadProxyAddressResolver
  );

  m.contract('TradingRewards', ETH_ADDRESS, ETH_ADDRESS, ReadProxyAddressResolver);

  m.group(issuer, SynthetixState).afterDeploy(m, 'afterDeployIssueSynthetixState', async (): Promise<void> => {
    await SynthetixState.instance().setAssociatedContract(issuer);

    const associatedContract = await SynthetixState.instance().associatedContract() as string;
    if (associatedContract != issuer?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  m.contract('EscrowChecker', SynthetixEscrow);

  m.group(synthetix, RewardEscrow).afterDeploy(m, 'afterDeployRewardEscrowSynthetics', async (): Promise<void> => {
    await RewardEscrow.instance().setSynthetix(synthetix);

    const associatedContract = await RewardEscrow.instance().synthetix() as string;
    if (associatedContract != synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  m.group(RewardEscrow, FeePool).afterDeploy(m, 'afterDeployRewardEscrowFeePool', async (): Promise<void> => {
    await RewardEscrow.instance().setFeePool(FeePool);

    const target = await RewardEscrow.instance().feePool() as string;
    if (target != FeePool?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

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

    m.group(supplySchedule, synthetix).afterDeploy(m, 'afterDeploySupplySchedule', async (): Promise<void> => {
      await supplySchedule.instance().setSynthetixProxy(synthetix);

      const target = await supplySchedule.instance().synthetixProxy() as string;
      if (target != synthetix?.deployMetaData?.contractAddress) {
        throw new Error('Address mismatch');
      }
    });
  }

  m.group(RewardsDistribution, synthetix).afterDeploy(m, 'afterDeployRewardDistribution', async (): Promise<void> => {
    await RewardsDistribution.instance().setAuthority(synthetix);

    const target = await RewardsDistribution.instance().authority() as string;
    if (target != synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  m.group(RewardsDistribution, synthetix).afterDeploy(m, 'afterDeployRewardDistributionProxySynthetix', async (): Promise<void> => {
    await RewardsDistribution.instance().setSynthetixProxy(ProxyERC20Synthetix);

    const target = await RewardsDistribution.instance().synthetixProxy() as string;
    if (target != ProxyERC20Synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, ProxyERC20Synthetix);

  m.group(SynthetixEscrow, synthetix).afterDeploy(m, 'afterDeploySynthetixEscrow', async (): Promise<void> => {
    await SynthetixEscrow.instance().setSynthetix(ProxyERC20Synthetix);

    const target = await SynthetixEscrow.instance().synthetix() as string;
    if (target != ProxyERC20Synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, ProxyERC20Synthetix);
});
