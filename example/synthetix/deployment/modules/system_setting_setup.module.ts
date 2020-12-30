import { ContractBinding, ContractEvent, module, ModuleBuilder } from '../../../../src/interfaces/mortar';
import { toBytes32 } from '../../util/util';
import * as web3utils from 'web3-utils';
import { chainIdToNetwork, constants } from '../../util/constants';
import { checkIfExist } from '../../../../src/packages/utils/util';
import { ethers } from 'ethers';
import { SynthetixCore } from './core.module';
import { SynthetixRebuildCache } from './rebuild_cache_module.module';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import { SynthetixSynths } from './synths.module';

const {
  MORTAR_NETWORK_ID
} = process.env;

export const SystemSettingsModule = module('SystemSettingsModule', async (m: ModuleBuilder) => {
  const libraries = await SynthetixLibraries;
  const prototypes = await SynthetixPrototypes;
  const core = await SynthetixCore;
  const synthsModule = await SynthetixSynths;
  const synthetixRebuildCache = await SynthetixRebuildCache;

  await m.bindModules(libraries, prototypes, core, synthsModule, synthetixRebuildCache);

  const synths = require('../local/synths.json');
  const synthsToAdd: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  for (const {name: currencyKey, subclass, asset} of synths) {
    const currencyKeyInBytes = toBytes32(currencyKey);
    const Synth = m.getBinding(`Synth${currencyKey}`);

    synthsToAdd.push({
      synth: Synth,
      currencyKeyInBytes,
    });
  }
  const SystemSettings = m.getBinding('SystemSettings');
  const rebuildCache = m.getEvent('rebuildCacheAfterDeployAllContracts').event as ContractEvent;
  m.group(...synthsToAdd.map(synth => synth.synth), rebuildCache).afterDeploy(m, 'afterDeploySystemSetting', async (): Promise<void> => {
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
});
