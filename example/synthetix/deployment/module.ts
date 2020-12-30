import path from 'path';
import { ContractBinding, ContractEvent, module, ModuleBuilder, ModuleConfig } from '../../../src/interfaces/mortar';
import { ethers } from 'ethers';
import * as web3utils from 'web3-utils';
import { checkIfExist } from '../../../src/packages/utils/util';
import { splitArrayIntoChunks, toBytes32 } from '../util/util';
import { chainIdToNetwork, constants, DEFAULTS } from '../util/constants';
import { JsonFragment } from '../../../src/packages/types/artifacts/abi';
import { SynthetixLibraries, SynthetixPrototypes } from './modules/helper.module';
import { SynthetixCore, useOvm } from './modules/core.module';
import { BinaryOptionsModule } from './modules/binary_options.module';
import { DappUtilities } from './modules/dapp_utilities.module';
import { SynthetixSynths } from './modules/synths.module';
import { SynthetixAncillary } from './modules/ancillary.module';

require('dotenv').config({path: path.resolve(__dirname + './../.env')});
const moduleConfig = require('./local/config.json') as ModuleConfig;

const {
  ETH_ADDRESS,
  MORTAR_NETWORK_ID
} = process.env;

export const SynthetixModule = module('SynthetixModule', async (m: ModuleBuilder) => {
  const libraries = await SynthetixLibraries;
  const prototypes = await SynthetixPrototypes;
  const core = await SynthetixCore;
  const synthsModule = await SynthetixSynths;
  const binaryOptionsModule = await BinaryOptionsModule;
  const dappUtilities = await DappUtilities;
  const synthetixAncillary = await SynthetixAncillary;
  await m.bindModules(libraries, prototypes, core, synthsModule, binaryOptionsModule, dappUtilities, synthetixAncillary);

  const ReadProxyAddressResolver = m.getBinding('ReadProxyAddressResolver');
  const ExchangeRates = m.getBinding('ExchangeRates');
  const AddressResolver = m.getBinding('AddressResolver');
  const Issuer = m.getBinding('Issuer');
  const DebtCache = m.getBinding('DebtCache');
  const SystemSettings = m.getBinding('SystemSettings');

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

  const setTargetInResolverFromReadProxy = m.getEvent('setTargetInResolverFromReadProxy').event as ContractEvent;
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

  const synths = require('./local/synths.json');

  const filteredSynths: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  const synthsToAdd: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  for (const {name: currencyKey, subclass, asset} of synths) {
    const sourceContractName = subclass || 'Synth';
    const currencyKeyInBytes = toBytes32(currencyKey);
    const Synth = m.getBinding(`Synth${currencyKey}`);

    synthsToAdd.push({
      synth: Synth,
      currencyKeyInBytes,
    });
  }
  for (const Synth of synthsToAdd) {
    m.group(Issuer, Synth.synth).afterDeploy(m, `afterDeployIssuerForSynth${Synth.synth.name}`, async (): Promise<void> => {
      const issuerSynthAddress = await Issuer.instance().synths(Synth.currencyKeyInBytes);
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

    m.group(Issuer, ...chunkBindings).afterDeploy(m, `afterDeployIssuerWithSynth${(i + synthChunkSize) / synthChunkSize}`, async (): Promise<void> => {
      await Issuer.instance().addSynths([chunkBindings.map(synth => synth)]);

      const data = await Issuer.instance().getSynths([chunk.map(synth => synth.currencyKeyInBytes)]);
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
    await checkSnapshot();
  });

  const refreshSnapshotIfPossible = async (wasInvalid: boolean, isInvalid: boolean, force = false) => {
    const validityChanged = wasInvalid !== isInvalid;

    if (force || validityChanged) {
      DebtCache.instance().takeDebtSnapshot({
        gasLimit: 2.5e6
      });
    } else if (!validityChanged) {

    }
  };

  const checkSnapshot = async () => {
    const [cacheInfo, currentDebt] = await Promise.all([
      DebtCache.instance().cacheInfo(),
      DebtCache.instance().currentDebt(),
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
}, moduleConfig);
