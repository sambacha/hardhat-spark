import path from 'path';
import {
  ContractBinding,
  module,
  ModuleBuilder,
  Prototype
} from '../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import * as web3utils from 'web3-utils';
import { checkIfExist } from '../../../src/packages/utils/util';
// @ts-ignore
import { splitArrayIntoChunks, toBytes32 } from '../util/util';
// @ts-ignore
import { DEFAULTS, chainIdToNetwork, constants } from '../util/constants';
import { JsonFragment } from '../../../src/packages/types/artifacts/abi';

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

  const setTargetInResolverFromReadProxy = ReadProxyAddressResolver.afterDeploy(m, 'setTargetInResolverFromReadProxy', async (): Promise<void> => {
    await ReadProxyAddressResolver.instance().setTarget(AddressResolver);

    const target = await ReadProxyAddressResolver.instance().target() as string;
    if (target != AddressResolver?.deployMetaData?.contractAddress) {
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

  m.group(DelegateApprovalsEternalStorage, DelegateApprovals).afterDeploy(m, 'afterDeployDelegateApprovalsEternalStorage', async (): Promise<void> => {
    await DelegateApprovalsEternalStorage.instance().setAssociatedContract(DelegateApprovals); // @TODO should be just binding

    const associatedContract = await DelegateApprovalsEternalStorage.instance().associatedContract() as string;
    if (associatedContract != DelegateApprovals?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  const Liquidations = m.contract('Liquidations', deployerAddress, ReadProxyAddressResolver);
  const EternalStorageLiquidations = m.bindPrototype('EternalStorageLiquidations', EternalStorage, deployerAddress, Liquidations);

  m.group(EternalStorageLiquidations, Liquidations).afterDeploy(m, 'afterDeployEternalStorageLiquidations', async (): Promise<void> => {
    await EternalStorageLiquidations.instance().setAssociatedContract(Liquidations);

    const associatedContract = await EternalStorageLiquidations.instance().associatedContract() as string;
    if (associatedContract != Liquidations?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

  const FeePoolEternalStorage = m.contract('FeePoolEternalStorage', deployerAddress, ethers.constants.AddressZero);
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

  const FeePoolState = m.contract('FeePoolState', deployerAddress, FeePool);

  m.group(FeePoolState, FeePool).afterDeploy(m, 'afterDeployFeePoolState', async (): Promise<void> => {
    await FeePoolState.instance().setFeePool(FeePool);

    const target = await FeePoolState.instance().feePool() as string;
    if (target != FeePool?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

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

  const ProxySynthetix = m.bindPrototype('ProxySynthetix', Proxy, deployerAddress);

  m.group(ProxySynthetix, synthetix).afterDeploy(m, 'afterDeployProxySynthetix', async (): Promise<void> => {
    await ProxySynthetix.instance().setTarget(synthetix);

    const target = await ProxySynthetix.instance().target() as string;
    if (target != synthetix?.deployMetaData?.contractAddress) {
      throw new Error('Address mismatch');
    }
  });

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
    await TokenStateSynthetix.instance().setBalanceOf(deployerAddress, currentSynthetixSupply);

    const balanceOf = await TokenStateSynthetix.instance().balanceOf(deployerAddress);
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
    useOvm ? Issuer : IssuerWithoutLiquidations,
    deployerAddress,
    ReadProxyAddressResolver
  );

  m.contract('TradingRewards', deployerAddress, deployerAddress, ReadProxyAddressResolver);

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

    m.group(Synth, TokenStateForSynth).afterDeploy(m, `afterDeploySynth${currencyKey}`, async (): Promise<void> => {
      await TokenStateForSynth.instance().setAssociatedContract(Synth);

      const associatedContract = await TokenStateForSynth.instance().associatedContract() as string;
      if (associatedContract != Synth?.deployMetaData?.contractAddress) {
        throw new Error('Address mismatch');
      }
    });

    m.group(Synth, ProxyForSynth).afterDeploy(m, `afterDeploySynthProxyForSynth${currencyKey}`, async (): Promise<void> => {
      await ProxyForSynth.instance().setTarget(Synth);

      const associatedContract = await ProxyForSynth.instance().target() as string;
      if (associatedContract != Synth?.deployMetaData?.contractAddress) {
        throw new Error('Address mismatch');
      }
    });

    if (proxyERC20ForSynth) {
      m.group(Synth, ProxyForSynth, proxyERC20ForSynth).afterDeploy(m, `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`, async (): Promise<void> => {
        await Synth.instance().setProxy(proxyERC20ForSynth); // @TODO should be just binding

        const associatedContract = await Synth.instance().proxy() as string;
        if (associatedContract != (proxyERC20ForSynth?.deployMetaData?.contractAddress)) {
          throw new Error('Address mismatch');
        }
      });

      m.group(proxyERC20ForSynth, ProxyForSynth, Synth).afterDeploy(m, `afterDeployProxyERC20ForSynth${currencyKey}`, async (): Promise<void> => {
        await ProxyForSynth.instance().setTarget(Synth);

        const target = await ProxyForSynth.instance().target() as string;
        if (target != (Synth?.deployMetaData?.contractAddress)) {
          throw new Error('Address mismatch');
        }
      });
    } else {
      m.group(Synth, ProxyForSynth).afterDeploy(m, `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`, async (): Promise<void> => {
        await Synth.instance().setProxy(ProxyForSynth?.deployMetaData?.contractAddress);

        const associatedContract = await Synth.instance().proxy() as string;
        if (associatedContract != ProxyForSynth?.deployMetaData?.contractAddress) {
          throw new Error('Address mismatch');
        }
      });
    }

    synthsToAdd.push({
      synth: Synth,
      currencyKeyInBytes,
    });

    const {feed} = feeds[asset] || {};
    if (ethers.utils.isAddress(feed)) {
      ExchangeRates.afterDeploy(m, `afterDeployExchangeRatesFeed${currencyKey}`, async (): Promise<void> => {
        await ExchangeRates.instance().addAggregator(currencyKeyInBytes, feed);

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
      ExchangeRates.afterDeploy(m, 'afterDeployExchangeRates', async (): Promise<void> => {
        await ExchangeRates.instance().addAggregator(toBytes32(asset), feed);

        const associatedContract = await ExchangeRates.instance().aggregators();
        if (associatedContract != toBytes32(asset)) {
          throw new Error('Address mismatch');
        }
      });
    }
  }

  const allContractDeployed = m.group(...Object.values(m.getAllBindings())).afterDeploy(m, 'afterAllContractsDeployed', async (): Promise<void> => {
    const contractAddresses: string[] = [];
    const contractBytes: string[] = [];

    const bindings = m.getAllBindings();
    Object.keys(bindings).map((key, index) => {
      if (checkIfExist(bindings[key].deployMetaData?.contractAddress)) {
        contractBytes.push(toBytes32(bindings[key].name));
        contractAddresses.push(bindings[key]?.deployMetaData?.contractAddress as string);
      }
    });

    await AddressResolver.instance().importAddresses(contractBytes, contractAddresses);

    const associatedContract = await AddressResolver.instance().areAddressesImported(contractBytes, contractAddresses);
    if (!associatedContract) {
      throw new Error('Address mismatch');
    }
  });


  const rebuildCache = m.group(...Object.values(m.getAllBindings()), setTargetInResolverFromReadProxy, allContractDeployed).afterDeploy(m, 'afterDeployAllContracts', async (): Promise<void> => {
    const bindings = m.getAllBindings();

    const addressesAreImported = false;
    const filterTargetsWith = ({functionName}: { functionName: string }) =>
      Object.entries(bindings).filter(([, target]) =>
        (target.abi as JsonFragment[]).find(({name}) => name === functionName)
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
           name: name,
           deployMetaData: {
             // @ts-ignore
             contractAddress
           }
         }
       ]) => [name, contractAddress]
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
      for (const addressToCache of addressesToCache) {
        if (
          addressToCache[0] === 'SynthetixBridgeToOptimism' ||
          addressToCache[0] === 'SynthetixBridgeToBase'
        ) {
          continue;
        }

        await AddressResolver.instance().rebuildCaches([addressToCache[1]], {
          gasLimit: 7e6
        });
      }
    }

    for (const [, contractBinding] of contractsWithRebuildableCache) {
      if (
        contractBinding.name === 'SynthetixBridgeToOptimism' ||
        contractBinding.name === 'SynthetixBridgeToBase'
      ) {
        continue;
      }

      await contractBinding.instance().rebuildCache({
        gasLimit: 500e3,
      });

      const isResolverCached = await contractBinding.instance().isResolverCached({
        gasLimit: 500e3,
      });
      if (!isResolverCached) {
        throw new Error('Resolver cached is not set ');
      }
    }

    // Now perform a sync of legacy contracts that have not been replaced in Shaula (v2.35.x)
    // EtherCollateral, EtherCollateralsUSD
    const contractsWithLegacyResolverCaching = filterTargetsWith({
      functionName: 'setResolverAndSyncCache',
    });
    for (const [, target] of contractsWithLegacyResolverCaching) {
      await target.instance().setResolverAndSyncCache(ReadProxyAddressResolver, {
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
      await target.instance().setResolver(ReadProxyAddressResolver, {
        gasLimit: 500e3,
      });

      const resolver = await target.instance().resolver({
        gasLimit: 500e3,
      });
      if (resolver != ReadProxyAddressResolver?.deployMetaData?.contractAddress) {
        throw new Error('Cache is not resolved');
      }
    }
  });

  const filteredSynths: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  for (const Synth of synthsToAdd) {
    m.group(issuer, Synth.synth).afterDeploy(m, `afterDeployIssuerForSynth${Synth.synth.name}`, async (): Promise<void> => {
      const issuerSynthAddress = await issuer.instance().synths(Synth.currencyKeyInBytes);
      const currentSynthAddress = Synth?.synth.deployMetaData?.contractAddress;
      if (issuerSynthAddress != currentSynthAddress) {
        filteredSynths.push(Synth);
      }
    });
  }

  const synthChunkSize = 15;

  for (let i = 0; i < filteredSynths.length; i += synthChunkSize) {
    const chunk = filteredSynths.slice(i, i + synthChunkSize);
    const chunkBindings = chunk.map(synth => synth.synth);

    m.group(issuer, ...chunkBindings).afterDeploy(m, `afterDeployIssuerWithSynth${(i + synthChunkSize) / synthChunkSize}`, async (): Promise<void> => {
      await issuer.instance().addSynths([chunkBindings.map(synth => synth)]);

      const data = await issuer.instance().getSynths([chunk.map(synth => synth.currencyKeyInBytes)]);
      if (
        data.length !== chunk.length ||
        data.every((cur: string, index: number) => cur !== chunkBindings[index]?.deployMetaData?.contractAddress)) {
        throw new Error('failed to match synths');
      }
    });
  }

  for (const {name: currencyKey, inverted} of synths) {
    if (inverted) {
      const {entryPoint, upperLimit, lowerLimit} = inverted;

      const setInversePricing = ({freezeAtUpperLimit, freezeAtLowerLimit}: {
        freezeAtUpperLimit: boolean,
        freezeAtLowerLimit: boolean
      }) =>
        ExchangeRates.afterDeploy(m, `afterDeployExchangeRatesSynth${currencyKey}`, async (): Promise<void> => {
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

  const afterDeploySystemSetting = m.group(...synthsToAdd.map(synth => synth.synth), rebuildCache).afterDeploy(m, 'afterDeploySystemSetting', async (): Promise<void> => {
    const bindings = synthsToAdd.map(synth => synth.synth);

    const synthRates: any = [];
    for (const binding of bindings) {
      const feeRate = await SystemSettings.instance().exchangeFeeRate(toBytes32(binding.name));

      synthRates.push(feeRate.toString());
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
      .filter(({currentRate}) => currentRate);

    if (synthsRatesToUpdate.length) {
      await SystemSettings.instance().setExchangeFeeRateForSynths(
        synthsRatesToUpdate.map(({name}) => toBytes32(name)),
        synthsRatesToUpdate.map(({targetRate}) => targetRate),
      );
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
    if (issuanceRation.toString() === '0') {
      throw new Error('issuance ration is different');
    }


    await SystemSettings.instance().setFeePeriodDuration(constants['FEE_PERIOD_DURATION']);

    const feePeriodDuration = await SystemSettings.instance().feePeriodDuration();
    if (feePeriodDuration.toString() === '0') {
      throw new Error('fee period duration is different');
    }

    await SystemSettings.instance().setTargetThreshold(constants['TARGET_THRESHOLD']);

    const targetThreshold = await SystemSettings.instance().targetThreshold();
    if (targetThreshold.toString() === '0') {
      throw new Error('target threshold is different');
    }


    await SystemSettings.instance().setLiquidationDelay(constants['LIQUIDATION_DELAY']);

    const liquidationDelay = await SystemSettings.instance().liquidationDelay();
    if (liquidationDelay.toString() === '0') {
      throw new Error('liquidation delay is different');
    }

    await SystemSettings.instance().setLiquidationRatio(constants['LIQUIDATION_RATIO']);

    const liquidationRation = await SystemSettings.instance().liquidationRatio();
    if (liquidationRation.toString() === '0') {
      throw new Error('liquidation ratio is different');
    }

    await SystemSettings.instance().setLiquidationPenalty(constants['LIQUIDATION_PENALTY']);

    const liquidationPenalty = await SystemSettings.instance().liquidationPenalty();
    if (liquidationPenalty.toString() === '0') {
      throw new Error('liquidation penalty is different');
    }

    await SystemSettings.instance().setRateStalePeriod(constants['RATE_STALE_PERIOD']);

    const rateStalePeriod = await SystemSettings.instance().rateStalePeriod();
    if (rateStalePeriod.toString() === '0') {
      throw new Error('rate stale period is different');
    }


    await SystemSettings.instance().setMinimumStakeTime(constants['MINIMUM_STAKE_TIME']);

    const minimumStakeTime = await SystemSettings.instance().minimumStakeTime();
    if (minimumStakeTime.toString() === '0') {
      throw new Error('minimum stake time is different');
    }


    await SystemSettings.instance().setDebtSnapshotStaleTime(constants['DEBT_SNAPSHOT_STALE_TIME']);

    const debtSnapshotStaleTime = await SystemSettings.instance().debtSnapshotStaleTime();
    if (debtSnapshotStaleTime.toString() === '0') {
      throw new Error('debt snapshot stale time is different');
    }

    await SystemSettings.instance().setCrossDomainMessageGasLimit(constants['CROSS_DOMAIN_MESSAGE_GAS_LIMIT']);

    const crossDomainMessageGasLimit = await SystemSettings.instance().crossDomainMessageGasLimit();
    if (crossDomainMessageGasLimit.toString() === '0') {
      throw new Error('cross domain message gas limit is different');
    }

    // @ts-ignore
    if (checkIfExist(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+MORTAR_NETWORK_ID]])) {
      // @ts-ignore
      await SystemSettings.instance().setAggregatorWarningFlags(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+MORTAR_NETWORK_ID]]);

      const aggregatorWarningFlags = await SystemSettings.instance().aggregatorWarningFlags();
      if (aggregatorWarningFlags.toString() === ethers.constants.AddressZero) {
        throw new Error('cross domain message gas limit is different');
      }
    }
  });

  m.group(...Object.values(m.getAllBindings()), afterDeploySystemSetting).afterDeploy(m, 'afterDeployDebtCacheAndAllBindingsAndEvents', async (): Promise<void> => {
    const performedSnapshot = await checkSnapshot();
  });

  const refreshSnapshotIfPossible = async (wasInvalid: boolean, isInvalid: boolean, force = false) => {
    const validityChanged = wasInvalid !== isInvalid;

    if (force || validityChanged) {
      debtCache.instance().takeDebtSnapshot({
        gasLimit: 2.5e6
      });
    } else if (!validityChanged) {

    }
  };

  const checkSnapshot = async () => {
    const [cacheInfo, currentDebt] = await Promise.all([
      debtCache.instance().cacheInfo(),
      debtCache.instance().currentDebt(),
    ]);

    // Check if the snapshot is stale and can be fixed.
    if (cacheInfo.isStale && !currentDebt.anyRateIsInvalid) {
      await refreshSnapshotIfPossible(
        cacheInfo.isInvalid,
        currentDebt.anyRateIsInvalid,
        cacheInfo.isStale
      );
      return true;
    }

    // Otherwise, if the rates are currently valid,
    // we might still need to take a snapshot due to invalidity or deviation.
    if (!currentDebt.anyRateIsInvalid) {
      if (cacheInfo.isInvalid) {
        await refreshSnapshotIfPossible(
          cacheInfo.isInvalid,
          currentDebt.anyRateIsInvalid,
          cacheInfo.isStale
        );
        return true;
      } else {
        const cachedDebtEther = web3utils.fromWei(cacheInfo.debt);
        const currentDebtEther = web3utils.fromWei(currentDebt.debt);
        const deviation =
          (Number(currentDebtEther) - Number(cachedDebtEther)) / Number(cachedDebtEther);
        const maxDeviation = DEFAULTS.debtSnapshotMaxDeviation;

        if (maxDeviation <= Math.abs(deviation)) {
          await refreshSnapshotIfPossible(cacheInfo.isInvalid, currentDebt.anyRateIsInvalid, true);
          return true;
        }
      }
    }

    // Finally, if the debt cache is currently valid, but needs to be invalidated, we will also perform a snapshot.
    if (!cacheInfo.isInvalid && currentDebt.anyRateIsInvalid) {
      await refreshSnapshotIfPossible(cacheInfo.isInvalid, currentDebt.anyRateIsInvalid, false);
      return true;
    }

    return false;
  };
});
