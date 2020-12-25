import path from 'path';
import {
  ContractBinding,
  DeployedContractBinding,
  module,
  ModuleBuilder,
  Prototype
} from '../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import * as web3utils from 'web3-utils';
import { checkIfExist } from '../../../src/packages/utils/util';
import { splitArrayIntoChunks, toBytes32 } from '../util/util';
import { chainIdToNetwork, constants } from '../util/constants';

require('dotenv').config({path: path.resolve(__dirname + './../.env')});

const {
  ETH_ADDRESS,
  MORTAR_NETWORK_ID
} = process.env;

const deployerAddress = ETH_ADDRESS;
const oracleExRatesContractAddress = deployerAddress;
const useOvm = false;
const currentSynthetixSupply = ethers.BigNumber.from('100000');
const currentWeekOfInflation = 0;
const currentLastMintEvent = 0;

export const SynthetixModule = module('SynthetixModule', async (m: ModuleBuilder) => {
  const ReadProxy = new Prototype('ReadProxy');
  const Proxy = new Prototype('Proxy');
  const EternalStorage = new Prototype('EternalStorage');
  const ProxyERC20 = new Prototype('ProxyERC20');
  const TokenState = new Prototype('TokenState');
  const MintableSynthetix = new Prototype('MintableSynthetix');
  const Synthetix = new Prototype('Synthetix');
  const RealtimeDebtCache = new Prototype('RealtimeDebtCache');
  const DebtCache = new Prototype('DebtCache');
  const Exchanger = new Prototype('Exchanger');
  const ExchangerWithVirtualSynth = new Prototype('ExchangerWithVirtualSynth');
  const IssuerWithoutLiquidations = new Prototype('IssuerWithoutLiquidations');
  const Issuer = new Prototype('Issuer');
  const FixedSupplySchedule = new Prototype('FixedSupplySchedule');
  const SourceContractMap: { [p: string]: Prototype } = {
    'Synth': new Prototype('Synth'),
    'PurgeableSynth': new Prototype('PurgeableSynth'),
    'MultiCollateralSynth': new Prototype('MultiCollateralSynth'),
  };
  const EmptyEtherCollateral = new Prototype('EmptyEtherCollateral');

  const SafeDecimalMath = m.contract('SafeDecimalMath');
  const MathLib = m.contract('Math');

  const AddressResolver = m.contract('AddressResolver', deployerAddress);
  const ReadProxyAddressResolver = m.bindPrototype('ReadProxyAddressResolver', ReadProxy, deployerAddress);

  ReadProxyAddressResolver.afterDeploy(m, 'setTargetInResolverFromReadProxy', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [ReadProxyAddressResolver, AddressResolver] = bindings;

    await ReadProxyAddressResolver.instance().setTarget(AddressResolver.txData.contractAddress); // @TODO should be just binding

    const target = await ReadProxyAddressResolver.instance().target() as string;
    if (target != AddressResolver.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, AddressResolver);

  const FlexibleStorage = m.contract('FlexibleStorage', ReadProxyAddressResolver);
  const SystemSettings = m.contract('SystemSettings', deployerAddress, ReadProxyAddressResolver);
  const SystemStatus = m.contract('SystemStatus', deployerAddress);
  const ExchangeRates = m.contract('ExchangeRates', deployerAddress, oracleExRatesContractAddress, ReadProxyAddressResolver, [], []);

  const RewardEscrow = m.contract('RewardEscrow', deployerAddress, ethers.constants.AddressZero, ethers.constants.AddressZero);
  const SynthetixEscrow = m.contract('SynthetixEscrow', deployerAddress, ethers.constants.AddressZero);
  const SynthetixState = m.contract('SynthetixState', deployerAddress, deployerAddress);

  const ProxyFeePool = m.bindPrototype('ProxyFeePool', Proxy, deployerAddress);

  const DelegateApprovalsEternalStorage = m.bindPrototype('DelegateApprovalsEternalStorage', EternalStorage, deployerAddress, ethers.constants.AddressZero);
  const DelegateApprovals = m.contract('DelegateApprovals', deployerAddress, DelegateApprovalsEternalStorage);

  DelegateApprovalsEternalStorage.afterDeploy(m, 'afterDeployDelegateApprovalsEternalStorage', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [DelegateApprovalsEternalStorage, DelegateApprovals] = bindings;

    await DelegateApprovalsEternalStorage.instance().setAssociatedContract(DelegateApprovals.txData.contractAddress); // @TODO should be just binding

    const associatedContract = await DelegateApprovalsEternalStorage.instance().associatedContract() as string;
    if (associatedContract != DelegateApprovals.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, DelegateApprovals);

  const Liquidations = m.contract('Liquidations', deployerAddress, ReadProxyAddressResolver);
  const EternalStorageLiquidations = m.bindPrototype('EternalStorageLiquidations', EternalStorage, deployerAddress, Liquidations);

  EternalStorageLiquidations.afterDeploy(m, 'afterDeployEternalStorageLiquidations', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [EternalStorageLiquidations, Liquidations] = bindings;

    await EternalStorageLiquidations.instance().setAssociatedContract(Liquidations.txData.contractAddress); // @TODO should be just binding

    const associatedContract = await EternalStorageLiquidations.instance().associatedContract() as string;
    if (associatedContract != Liquidations.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, Liquidations);

  const FeePoolEternalStorage = m.contract('FeePoolEternalStorage', deployerAddress, ethers.constants.AddressZero);
  const FeePool = m.contract('FeePool', ProxyFeePool, AddressResolver, ReadProxyAddressResolver);

  FeePoolEternalStorage.afterDeploy(m, 'afterDeployFeePoolEternalStorage', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [FeePoolEternalStorage, FeePool] = bindings;

    await FeePoolEternalStorage.instance().setAssociatedContract(FeePool.txData.contractAddress); // @TODO should be just binding

    const associatedContract = await FeePoolEternalStorage.instance().associatedContract() as string;
    if (associatedContract != FeePool.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, FeePool);


  FeePool.afterDeploy(m, 'afterDeployFeePool', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [FeePool, ProxyFeePoll] = bindings;

    await ProxyFeePoll.instance().setTarget(FeePool.txData.contractAddress);

    const target = await ProxyFeePoll.instance().target() as string;
    if (target != FeePool.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, ProxyFeePool);

  const FeePoolState = m.contract('FeePoolState', deployerAddress, FeePool);

  FeePoolState.afterDeploy(m, 'afterDeployFeePoolState', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [FeePoolState, FeePool] = bindings;

    await FeePoolState.instance().setFeePool(FeePool.txData.contractAddress);

    const target = await FeePoolState.instance().feePool() as string;
    if (target != FeePool.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, FeePool);

  const RewardsDistribution = m.contract(
    'RewardsDistribution',
    deployerAddress,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    RewardEscrow,
    ProxyFeePool
  );

  const ProxyERC20Synthetix = m.bindPrototype('ProxyERC20Synthetix', ProxyERC20, deployerAddress);
  const TokenStateSynthetix = m.bindPrototype('TokenStateSynthetix', TokenState, deployerAddress, deployerAddress);

  const synthetix = m.bindPrototype(
    'Synthetix',
    useOvm ? MintableSynthetix : Synthetix,
    ProxyERC20Synthetix,
    TokenStateSynthetix,
    deployerAddress,
    currentSynthetixSupply,
    ReadProxyAddressResolver
  );

  synthetix.afterDeploy(m, 'afterDeploySynthetixProxyERC20Synthetix', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [Synthetix, ProxyERC20Synthetix] = bindings;

    await ProxyERC20Synthetix.instance().setTarget(Synthetix.txData.contractAddress);

    const target = await ProxyERC20Synthetix.instance().target() as string;
    if (target != Synthetix.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, ProxyERC20Synthetix);

  synthetix.afterDeploy(m, 'afterDeployProxyERC20SynthetixSynthetix', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [Synthetix, ProxyERC20Synthetix] = bindings;

    await Synthetix.instance().setProxy(ProxyERC20Synthetix.txData.contractAddress);

    const target = await Synthetix.instance().proxy() as string;
    if (target != ProxyERC20Synthetix.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, ProxyERC20Synthetix);

  const ProxySynthetix = m.bindPrototype('ProxySynthetix', Proxy, deployerAddress);

  ProxySynthetix.afterDeploy(m, 'afterDeployProxySynthetix', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [ProxySynthetix, Synthetix] = bindings;

    await ProxySynthetix.instance().setTarget(Synthetix.txData.contractAddress);

    const target = await ProxySynthetix.instance().target() as string;
    if (target != Synthetix.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, synthetix);

  const debtCache = m.bindPrototype(
    'DebtCache',
    useOvm ? RealtimeDebtCache : DebtCache,
    deployerAddress,
    ReadProxyAddressResolver
  );

  const exchanger = m.bindPrototype(
    'Exchanger',
    useOvm ? Exchanger : ExchangerWithVirtualSynth,
    deployerAddress,
    ReadProxyAddressResolver
  );
  const exchangeState = m.contract('ExchangeState', deployerAddress, exchanger);

  exchangeState.afterDeploy(m, 'afterDeployExchangeState', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [ExchangeState, Exchanger] = bindings;

    await ExchangeState.instance().setAssociatedContract(Exchanger.txData.contractAddress); // @TODO should be just binding

    const associatedContract = await ExchangeState.instance().associatedContract() as string;
    if (associatedContract != Exchanger.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, exchanger);

  exchanger.afterDeploy(m, 'afterDeployExchanger', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [Exchanger, SystemStatus] = bindings;

    await SystemStatus.instance().updateAccessControl(
      toBytes32('Synth'),
      Exchanger.txData.contractAddress,
      true,
      false
    ); // @TODO should be just binding

    const accessControl = await SystemStatus.instance().accessControl(
      toBytes32('Synth'),
      Exchanger.txData.contractAddress,
    );
    if (
      accessControl[0] != true &&
      accessControl[1] != false
    ) {
      throw new Error('Address mismatch');
    }
  }, SystemStatus);

  TokenStateSynthetix.afterDeploy(m, 'afterDeployTokenStateSynthetix', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [TokenStateSynthetix] = bindings;

    await TokenStateSynthetix.instance().setBalanceOf(deployerAddress, currentSynthetixSupply);

    const balanceOf = await TokenStateSynthetix.instance().balanceOf(deployerAddress);
    if (!currentSynthetixSupply.eq(balanceOf)) {
      throw new Error('Address mismatch');
    }
  });

  TokenStateSynthetix.afterDeploy(m, 'afterDeployTokenStateSynthetixAndSynthetix', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [TokenStateSynthetix, Synthetix] = bindings;

    await TokenStateSynthetix.instance().setAssociatedContract(Synthetix.txData.contractAddress); // @TODO should be just binding

    const associatedContract = await TokenStateSynthetix.instance().associatedContract() as string;
    if (associatedContract != Synthetix.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, synthetix);

  const issuer = m.bindPrototype('Issuer',
    useOvm ? Issuer : IssuerWithoutLiquidations,
    deployerAddress,
    ReadProxyAddressResolver
  );

  m.contract('TradingRewards', deployerAddress, deployerAddress, ReadProxyAddressResolver);

  issuer.afterDeploy(m, 'afterDeployIssueSynthetixState', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [Issuer, SynthetixState] = bindings;

    await SynthetixState.instance().setAssociatedContract(Issuer.txData.contractAddress); // @TODO should be just binding

    const associatedContract = await SynthetixState.instance().associatedContract() as string;
    if (associatedContract != Issuer.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, SynthetixState);

  m.contract('EscrowChecker', SynthetixEscrow);

  synthetix.afterDeploy(m, 'afterDeployRewardEscrowSynthetics', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [Synthetix, RewardEscrow] = bindings;

    await RewardEscrow.instance().setSynthetix(Synthetix.txData.contractAddress); // @TODO should be just binding

    const associatedContract = await RewardEscrow.instance().synthetix() as string;
    if (associatedContract != Synthetix.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, RewardEscrow);

  RewardEscrow.afterDeploy(m, 'afterDeployRewardEscrowFeePool', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [RewardEscrow, FeePool] = bindings;

    await RewardEscrow.instance().setFeePool(FeePool.txData.contractAddress);

    const target = await RewardEscrow.instance().feePool() as string;
    if (target != FeePool.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, FeePool);

  if (useOvm) {
    const inflationStartDate = (Math.round(new Date().getTime() / 1000) - 3600 * 24 * 7).toString(); // 1 week ago
    const fixedPeriodicSupply = web3utils.toWei('50000');
    const mintPeriod = (3600 * 24 * 7).toString(); // 1 week
    const mintBuffer = '600'; // 10 minutes
    const minterReward = web3utils.toWei('100');
    const supplyEnd = '5'; // allow 4 mints in total

    m.bindPrototype('SupplySchedule', FixedSupplySchedule,
      deployerAddress,
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
    const supplySchedule = m.contract('SupplySchedule', deployerAddress, currentLastMintEvent, currentWeekOfInflation);

    supplySchedule.afterDeploy(m, 'afterDeploySupplySchedule', async (...bindings: DeployedContractBinding[]): Promise<void> => {
      const [SupplySchedule, Synthetix] = bindings;

      await SupplySchedule.instance().setSynthetixProxy(Synthetix.txData.contractAddress);

      const target = await SupplySchedule.instance().synthetixProxy() as string;
      if (target != Synthetix.txData.contractAddress) {
        throw new Error('Address mismatch');
      }
    }, synthetix);
  }

  RewardsDistribution.afterDeploy(m, 'afterDeployRewardDistribution', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [RewardsDistribution, Synthetix] = bindings;

    await RewardsDistribution.instance().setAuthority(Synthetix.txData.contractAddress);

    const target = await RewardsDistribution.instance().authority() as string;
    if (target != Synthetix.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, synthetix);

  RewardsDistribution.afterDeploy(m, 'afterDeployRewardDistributionProxySynthetix', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [RewardsDistribution, Synthetix, ProxyERC20Synthetix] = bindings;

    await RewardsDistribution.instance().setSynthetixProxy(ProxyERC20Synthetix.txData.contractAddress);

    const target = await RewardsDistribution.instance().synthetixProxy() as string;
    if (target != ProxyERC20Synthetix.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, synthetix, ProxyERC20Synthetix);

  SynthetixEscrow.afterDeploy(m, 'afterDeploySynthetixEscrow', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [RewardsDistribution, Synthetix, ProxyERC20Synthetix] = bindings;

    await RewardsDistribution.instance().setSynthetix(ProxyERC20Synthetix.txData.contractAddress);

    const target = await RewardsDistribution.instance().synthetix() as string;
    if (target != ProxyERC20Synthetix.txData.contractAddress) {
      throw new Error('Address mismatch');
    }
  }, synthetix, ProxyERC20Synthetix);

  const synths = require('./local/synths.json');
  const feeds = require('./local/feeds.json');
  const standaloneFeeds: { asset: string, feed: string }[] = [];
  Object.values(feeds).map(value => {
    standaloneFeeds.push(value as { asset: string, feed: string });
  });

  const synthsToAdd: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];

  for (const {name: currencyKey, subclass, asset} of synths) {
    const TokenStateForSynth = m.bindPrototype(`TokenState${currencyKey}`, TokenState, deployerAddress, ethers.constants.AddressZero);

    const synthProxyIsLegacy = currencyKey === 'sUSD' && MORTAR_NETWORK_ID === '1';

    const ProxyForSynth = m.bindPrototype(
      `Proxy${currencyKey}`,
      synthProxyIsLegacy ? Proxy : ProxyERC20,
      deployerAddress
    );

    let proxyERC20ForSynth: ContractBinding | undefined;
    if (currencyKey === 'sUSD') {
      proxyERC20ForSynth = m.bindPrototype(`ProxyERC20${currencyKey}`, ProxyERC20, deployerAddress);
    }

    const currencyKeyInBytes = toBytes32(currencyKey);
    const originalTotalSupply = 0;
    const additionalConstructorArgsMap: { [p: string]: string[] } = {
      MultiCollateralSynthsETH: [toBytes32('EtherCollateral')],
      MultiCollateralSynthsUSD: [toBytes32('EtherCollateralsUSD')],
      // future subclasses...
      // future specific synths args...
    };

    const sourceContractName = subclass || 'Synth';

    const Synth = m.bindPrototype(
      `Synth${currencyKey}`,
      SourceContractMap[sourceContractName] as Prototype,
      proxyERC20ForSynth ? proxyERC20ForSynth : ProxyForSynth,
      TokenStateForSynth,
      `Synth ${currencyKey}`,
      currencyKey,
      deployerAddress,
      currencyKeyInBytes,
      originalTotalSupply,
      ReadProxyAddressResolver,
      ...(additionalConstructorArgsMap[(sourceContractName + currencyKey)] || [])
    );

    Synth.afterDeploy(m, `afterDeploySynth${currencyKey}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
      const [Synth, TokenStateForSynth] = bindings;

      await TokenStateForSynth.instance().setAssociatedContract(Synth.txData.contractAddress); // @TODO should be just binding

      const associatedContract = await TokenStateForSynth.instance().associatedContract() as string;
      if (associatedContract != Synth.txData.contractAddress) {
        throw new Error('Address mismatch');
      }
    }, TokenStateForSynth);

    Synth.afterDeploy(m, `afterDeploySynthProxyForSynth${currencyKey}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
      const [Synth, ProxyForSynth] = bindings;

      await ProxyForSynth.instance().setTarget(Synth.txData.contractAddress); // @TODO should be just binding

      const associatedContract = await ProxyForSynth.instance().target() as string;
      if (associatedContract != Synth.txData.contractAddress) {
        throw new Error('Address mismatch');
      }
    }, ProxyForSynth);

    if (proxyERC20ForSynth) {
      Synth.afterDeploy(m, `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
        const [Synth, ProxyForSynth, ProxyERC20ForSynth] = bindings;

        await Synth.instance().setProxy(ProxyERC20ForSynth.txData.contractAddress); // @TODO should be just binding

        const associatedContract = await Synth.instance().proxy() as string;
        if (associatedContract != (ProxyERC20ForSynth.txData.contractAddress)) {
          throw new Error('Address mismatch');
        }
      }, ProxyForSynth, proxyERC20ForSynth);

      proxyERC20ForSynth.afterDeploy(m, `afterDeployProxyERC20ForSynth${currencyKey}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
        const [ProxyERC20ForSynth, ProxyForSynth, Synth] = bindings;

        await ProxyForSynth.instance().setTarget(Synth.txData.contractAddress); // @TODO should be just binding

        const target = await ProxyForSynth.instance().target() as string;
        if (target != (Synth.txData.contractAddress)) {
          throw new Error('Address mismatch');
        }
      }, ProxyForSynth, Synth);
    } else {
      Synth.afterDeploy(m, `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
        const [Synth, ProxyForSynth] = bindings;

        await Synth.instance().setProxy(ProxyForSynth.txData.contractAddress); // @TODO should be just binding

        const associatedContract = await Synth.instance().proxy() as string;
        if (associatedContract != ProxyForSynth.txData.contractAddress) {
          throw new Error('Address mismatch');
        }
      }, ProxyForSynth);
    }

    synthsToAdd.push({
      synth: Synth,
      currencyKeyInBytes,
    });

    const {feed} = feeds[asset] || {};
    if (ethers.utils.isAddress(feed)) {
      ExchangeRates.afterDeploy(m, `afterDeployExchangeRatesFeed${currencyKey}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
        const [ExchangeRates] = bindings;

        await ExchangeRates.instance().addAggregator(currencyKeyInBytes, feed); // @TODO should be just binding

        const aggregator = await ExchangeRates.instance().aggregators(currencyKeyInBytes) as string;
        if (aggregator != feed) {
          throw new Error('Address mismatch');
        }
      });
    }
  }

  m.contract('Depot', deployerAddress, deployerAddress, ReadProxyAddressResolver);

  if (useOvm) {
    m.bindPrototype('EtherCollateral', EmptyEtherCollateral);
    m.bindPrototype('EtherCollateralsUSD', EmptyEtherCollateral);
    m.contract('SynthetixBridgeToBase', deployerAddress, ReadProxyAddressResolver);
  } else {
    m.contract('EtherCollateral', deployerAddress, ReadProxyAddressResolver);
    m.contract('EtherCollateralsUSD', deployerAddress, ReadProxyAddressResolver);
    m.contract('SynthetixBridgeToOptimism', deployerAddress, ReadProxyAddressResolver);
  }

  m.contract('BinaryOptionMarketFactory', deployerAddress, ReadProxyAddressResolver);

  const day = 24 * 60 * 60;
  const maxOraclePriceAge = 120 * 60; // Price updates are accepted from up to two hours before maturity to allow for delayed chainlink heartbeats.
  const expiryDuration = 26 * 7 * day; // Six months to exercise options before the market is destructible.
  const maxTimeToMaturity = 730 * day; // Markets may not be deployed more than two years in the future.
  const creatorCapitalRequirement = web3utils.toWei('1000'); // 1000 sUSD is required to create a new market.
  const creatorSkewLimit = web3utils.toWei('0.05'); // Market creators must leave 5% or more of their position on either side.
  const poolFee = web3utils.toWei('0.008'); // 0.8% of the market's value goes to the pool in the end.
  const creatorFee = web3utils.toWei('0.002'); // 0.2% of the market's value goes to the creator.
  const refundFee = web3utils.toWei('0.05'); // 5% of a bid stays in the pot if it is refunded.

  m.contract(
    'BinaryOptionMarketManager',
    deployerAddress,
    ReadProxyAddressResolver,
    maxOraclePriceAge,
    expiryDuration,
    maxTimeToMaturity,
    creatorCapitalRequirement,
    creatorSkewLimit,
    poolFee,
    creatorFee,
    refundFee
  );

  m.contract('SynthUtil', ReadProxyAddressResolver);
  m.contract('DappMaintenance', deployerAddress);
  m.contract('BinaryOptionMarketData');

  for (const {asset, feed} of standaloneFeeds) {
    if (ethers.utils.isAddress(feed)) {

      ExchangeRates.afterDeploy(m, 'afterDeployExchangeRates', async (...bindings: DeployedContractBinding[]): Promise<void> => {
        const [ExchangeRates] = bindings;

        await ExchangeRates.instance().addAggregator(toBytes32(asset), feed);

        const associatedContract = await ExchangeRates.instance().aggregators();
        if (associatedContract != toBytes32(asset)) {
          throw new Error('Address mismatch');
        }
      });
    }
  }

  const allContractDeployed = AddressResolver.afterDeploy(m, 'afterAllContractsDeployed', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [AddressResolver] = bindings;
    const contractAddresses: string[] = [];
    const contractBytes: string[] = [];
    bindings.shift();
    Object.keys(bindings).map((key, index) => {
      if (checkIfExist(bindings[index].txData?.contractAddress)) {
        contractBytes.push(toBytes32(bindings[index].name));
        contractAddresses.push(bindings[index].txData.contractAddress as string);
      }
    });

    await AddressResolver.instance().importAddresses(contractBytes, contractAddresses);

    const associatedContract = await AddressResolver.instance().areAddressesImported(contractBytes, contractAddresses);
    if (!associatedContract) {
      throw new Error('Address mismatch');
    }
  }, ...Object.values(m.getAllBindings()));


  const rebuildCache = AddressResolver.afterDeploy(m, 'afterDeployAllContracts', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [AddressResolver, ReadProxyAddressResolver, SystemSettings] = bindings;
    bindings.shift();
    bindings.shift();
    bindings.shift();

    const addressesAreImported = false;
    const filterTargetsWith = ({functionName}: { functionName: string }) =>
      Object.entries(bindings).filter(([, target]) =>
        target.abi.find(({name}) => name === functionName)
      );

    const contractsWithRebuildableCache = filterTargetsWith({functionName: 'rebuildCache'})
      // And filter out the bridge contracts as they have resolver requirements that cannot be met in this deployment
      .filter(([contract]) => {
        return !/^(SynthetixBridgeToOptimism|SynthetixBridgeToBase)$/.test(contract);
      });

    const addressesToCache = contractsWithRebuildableCache.map(
      ([
         ,
         {
           txData: {
             contractAddress
           }
         }
       ]) => contractAddress
    );

    if (useOvm) {
      const chunks = splitArrayIntoChunks(addressesToCache, 4);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await AddressResolver.instance().rebuildCaches([chunk], {
          gasLimit: 7e6
        });
      }
    } else {
      // @TODO their is a revert here, tackle this problem later.
      await AddressResolver.instance().rebuildCaches(addressesToCache, {
        gasLimit: 7e6
      });
    }

    for (const [, contractBinding] of contractsWithRebuildableCache) {

      await contractBinding.instance().rebuildCache({
        gasLimit: 500e3,
      });

      const isResolverCached = await contractBinding.instance().isResolverCached({
        gasLimit: 500e3,
      });
      if (isResolverCached) {
        throw new Error('Resolver cached is not set ');
      }
    }

    // Now perform a sync of legacy contracts that have not been replaced in Shaula (v2.35.x)
    // EtherCollateral, EtherCollateralsUSD
    const contractsWithLegacyResolverCaching = filterTargetsWith({
      functionName: 'setResolverAndSyncCache',
    });
    for (const [, target] of contractsWithLegacyResolverCaching) {
      await target.instance().setResolverAndSyncCache(ReadProxyAddressResolver.txData.contractAddress, {
        gasLimit: 500e3,
      });

      const input = await target.instance().isResolverCached({
        gasLimit: 500e3,
      });
      if (!input) {
        throw new Error('Cache is not resolved');
      }
    }

    // Finally set resolver on contracts even older than legacy (Depot)
    const contractsWithLegacyResolverNoCache = filterTargetsWith({
      functionName: 'setResolver',
    });
    for (const [, target] of contractsWithLegacyResolverNoCache) {
      await target.instance().setResolver(ReadProxyAddressResolver.txData.contractAddress, {
        gasLimit: 500e3,
      });

      const resolver = await target.instance().resolver({
        gasLimit: 500e3,
      });
      if (resolver != ReadProxyAddressResolver.txData.contractAddress) {
        throw new Error('Cache is not resolved');
      }
    }
  }, ReadProxyAddressResolver, SystemSettings, ...Object.values(m.getAllBindings()), allContractDeployed);


  const filteredSynths: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  for (const synth of synthsToAdd) {
    issuer.afterDeploy(m, `afterDeployIssuerForSynth${synth.synth.name}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
      const [Issuer, Synth] = bindings;

      const issuerSynthAddress = await Issuer.instance().synths(synth.currencyKeyInBytes);
      const currentSynthAddress = Synth.txData.contractAddress;
      if (issuerSynthAddress != currentSynthAddress) {
        filteredSynths.push(synth);
      }
    }, synth.synth);
  }

  const synthChunkSize = 15;

  for (let i = 0; i < filteredSynths.length; i += synthChunkSize) {
    const chunk = filteredSynths.slice(i, i + synthChunkSize);
    const chunkBindings = chunk.map(synth => synth.synth);

    issuer.afterDeploy(m, `afterDeployIssuerWithSynth${(i + synthChunkSize) / synthChunkSize}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
      const [Issuer] = bindings;

      bindings.unshift();
      await Issuer.instance().addSynths([bindings.map(synth => synth.txData.contractAddress)]);

      const data = await Issuer.instance().getSynths([chunk.map(synth => synth.currencyKeyInBytes)]);
      if (
        data.length !== chunk.length ||
        data.every((cur: string, index: number) => cur !== bindings[index].txData.contractAddress)) {
        throw new Error('failed to match synths');
      }
    }, ...chunkBindings);
  }

  for (const {name: currencyKey, inverted} of synths) {
    if (inverted) {
      const {entryPoint, upperLimit, lowerLimit} = inverted;

      const setInversePricing = ({freezeAtUpperLimit, freezeAtLowerLimit}: {
        freezeAtUpperLimit: boolean,
        freezeAtLowerLimit: boolean
      }) =>
        ExchangeRates.afterDeploy(m, `afterDeployExchangeRatesSynth${currencyKey}`, async (...bindings: DeployedContractBinding[]): Promise<void> => {
          const [ExchangeRates] = bindings;

          await ExchangeRates.instance().setInversePricing(
            toBytes32(currencyKey),
            web3utils.toWei(entryPoint.toString()),
            web3utils.toWei(upperLimit.toString()),
            web3utils.toWei(lowerLimit.toString()),
            freezeAtUpperLimit,
            freezeAtLowerLimit);
        });

      // oldExrates = false
      if (false) {
        // this deployment is for local network and we will not use oldExrates
      } else {
        await setInversePricing({freezeAtUpperLimit: false, freezeAtLowerLimit: false});
      }
    }
  }

  SystemSettings.afterDeploy(m, 'afterDeploySystemSetting', async (...bindings: DeployedContractBinding[]): Promise<void> => {
    const [SystemSettings] = bindings;
    bindings.shift();
    const synthRates: any = [];
    for (const binding of bindings) {
      const feeRate = await SystemSettings.instance().exchangeFeeRate(toBytes32(binding.name));

      synthRates.push(feeRate);
    }

    const synthExchangeRateOverride: { [name: string]: string } = {
      sETH: web3utils.toWei('0.003').toString(),
      iETH: web3utils.toWei('0.003').toString(),
      sBTC: web3utils.toWei('0.003').toString(),
      iBTC: web3utils.toWei('0.003').toString(),
    };

    const exchangeFeeRates: { [name: string]: any } = constants['EXCHANGE_FEE_RATES'];
    const synthsRatesToUpdate = bindings
      .map((synth, i) =>
        Object.assign(
          {
            currentRate: web3utils.fromWei(synthRates[i] || '0'),
            targetRate:
              synth.name in synthExchangeRateOverride
                ? synthExchangeRateOverride[synth.name] as string
                : exchangeFeeRates['crypto'], // this is local network so we will keep crypto as default
          },
          synth
        )
      )
      .filter(({currentRate}) => currentRate === '0');

    if (synthsRatesToUpdate.length) {
      await SystemSettings.instance().setExchangeFeeRateForSynths([
        synthsRatesToUpdate.map(({name}) => toBytes32(name)),
        synthsRatesToUpdate.map(({targetRate}) => targetRate),
      ]);
    }

    await SystemSettings.instance().setWaitingPeriodSecs(constants['WAITING_PERIOD_SECS']);

    const waitingPeriod = await SystemSettings.instance().waitingPeriodSecs();
    if (waitingPeriod != constants['WAITING_PERIOD_SECS']) {
      throw new Error('waiting period is different');
    }

    await SystemSettings.instance().setPriceDeviationThresholdFactor(constants['PRICE_DEVIATION_THRESHOLD_FACTOR']);

    const priceDeviationThresholdFactor = await SystemSettings.instance().priceDeviationThresholdFactor();
    if (priceDeviationThresholdFactor != constants['PRICE_DEVIATION_THRESHOLD_FACTOR']) {
      throw new Error('price deviation is different');
    }

    await SystemSettings.instance().setTradingRewardsEnabled(constants['TRADING_REWARDS_ENABLED']);

    const tradingRewardsEnabled = await SystemSettings.instance().tradingRewardsEnabled();
    if (tradingRewardsEnabled != constants['TRADING_REWARDS_ENABLED']) {
      throw new Error('trading reward is different');
    }

    await SystemSettings.instance().setIssuanceRatio(constants['ISSUANCE_RATIO']);

    const issuanceRation = await SystemSettings.instance().issuanceRatio();
    if (issuanceRation != '0') {
      throw new Error('issuance ration is different');
    }


    await SystemSettings.instance().setFeePeriodDuration(constants['FEE_PERIOD_DURATION']);

    const feePeriodDuration = await SystemSettings.instance().feePeriodDuration();
    if (feePeriodDuration != '0') {
      throw new Error('fee period duration is different');
    }

    await SystemSettings.instance().setTargetThreshold(constants['TARGET_THRESHOLD']);

    const targetThreshold = await SystemSettings.instance().targetThreshold();
    if (targetThreshold != '0') {
      throw new Error('target threshold is different');
    }


    await SystemSettings.instance().setLiquidationDelay(constants['LIQUIDATION_DELAY']);

    const liquidationDelay = await SystemSettings.instance().liquidationDelay();
    if (liquidationDelay != '0') {
      throw new Error('liquidation delay is different');
    }

    await SystemSettings.instance().setLiquidationRatio(constants['LIQUIDATION_RATIO']);

    const liquidationRation = await SystemSettings.instance().liquidationRatio();
    if (liquidationRation != '0') {
      throw new Error('liquidation ratio is different');
    }

    await SystemSettings.instance().setLiquidationPenalty(constants['LIQUIDATION_PENALTY']);

    const liquidationPenalty = await SystemSettings.instance().liquidationPenalty();
    if (liquidationPenalty != '0') {
      throw new Error('liquidation penalty is different');
    }

    await SystemSettings.instance().setRateStalePeriod(constants['RATE_STALE_PERIOD']);

    const rateStalePeriod = await SystemSettings.instance().rateStalePeriod();
    if (rateStalePeriod != '0') {
      throw new Error('rate stale period is different');
    }


    await SystemSettings.instance().setMinimumStakeTime(constants['MINIMUM_STAKE_TIME']);

    const minimumStakeTime = await SystemSettings.instance().minimumStakeTime();
    if (minimumStakeTime != '0') {
      throw new Error('minimum stake time is different');
    }


    await SystemSettings.instance().setDebtSnapshotStaleTime(constants['DEBT_SNAPSHOT_STALE_TIME']);

    const debtSnapshotStaleTime = await SystemSettings.instance().debtSnapshotStaleTime();
    if (debtSnapshotStaleTime != '0') {
      throw new Error('debt snapshot stale time is different');
    }

    await SystemSettings.instance().setCrossDomainMessageGasLimit(constants['CROSS_DOMAIN_MESSAGE_GAS_LIMIT']);

    const crossDomainMessageGasLimit = await SystemSettings.instance().crossDomainMessageGasLimit();
    if (crossDomainMessageGasLimit != '0') {
      throw new Error('cross domain message gas limit is different');
    }

    // @ts-ignore
    await SystemSettings.instance().setAggregatorWarningFlags(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+MORTAR_NETWORK_ID]]);

    const aggregatorWarningFlags = await SystemSettings.instance().aggregatorWarningFlags();
    if (aggregatorWarningFlags != ethers.constants.AddressZero) {
      throw new Error('cross domain message gas limit is different');
    }
  }, ...synthsToAdd.map(synth => synth.synth), rebuildCache);
});
