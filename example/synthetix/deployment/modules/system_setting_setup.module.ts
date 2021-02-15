import {
  ContractBinding,
  ContractEvent,
  buildModule,
} from '../../../../src/interfaces/mortar';
import { expectFuncRead } from '../../../../src/interfaces/helper/expectancy';
import { toBytes32 } from '../../util/util';
import * as web3utils from 'web3-utils';
import { chainIdToNetwork, constants } from '../../util/constants';
import { checkIfExist } from '../../../../src/packages/utils/util';
import { ethers } from 'ethers';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';

const {
  MORTAR_NETWORK_ID
} = process.env;

export const SystemSettingsModule = buildModule('SystemSettingsModule', async (m: SynthetixModuleBuilder) => {
  const synthsToAdd: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  for (const {name: currencyKey} of m.synths) {
    const currencyKeyInBytes = toBytes32(currencyKey);
    const Synth = m.getBinding(`Synth${currencyKey}`);

    synthsToAdd.push({
      synth: Synth,
      currencyKeyInBytes,
    });
  }
  const SystemSettings = m.SystemSettings;
  const rebuildCache = m.rebuildCacheAfterDeployAllContracts.event as ContractEvent;
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
    await expectFuncRead(constants['WAITING_PERIOD_SECS'], SystemSettings.instance().waitingPeriodSecs);

    await SystemSettings.instance().setPriceDeviationThresholdFactor(constants['PRICE_DEVIATION_THRESHOLD_FACTOR']);
    await expectFuncRead(constants['PRICE_DEVIATION_THRESHOLD_FACTOR'], SystemSettings.instance().priceDeviationThresholdFactor);

    await SystemSettings.instance().setTradingRewardsEnabled(constants['TRADING_REWARDS_ENABLED']);
    await expectFuncRead(constants['TRADING_REWARDS_ENABLED'], SystemSettings.instance().tradingRewardsEnabled);

    await SystemSettings.instance().setIssuanceRatio(constants['ISSUANCE_RATIO']);
    await expectFuncRead(constants['ISSUANCE_RATIO'], SystemSettings.instance().issuanceRatio);

    await SystemSettings.instance().setFeePeriodDuration(constants['FEE_PERIOD_DURATION']);
    await expectFuncRead(constants['FEE_PERIOD_DURATION'], SystemSettings.instance().feePeriodDuration);

    await SystemSettings.instance().setTargetThreshold(constants['TARGET_THRESHOLD']);
    await expectFuncRead(
      ethers.BigNumber.from(constants['TARGET_THRESHOLD']).mul('10000000000000000').toString()
      , SystemSettings.instance().targetThreshold);

    await SystemSettings.instance().setLiquidationDelay(constants['LIQUIDATION_DELAY']);
    await expectFuncRead(constants['LIQUIDATION_DELAY'], SystemSettings.instance().liquidationDelay);

    await SystemSettings.instance().setLiquidationRatio(constants['LIQUIDATION_RATIO']);
    await expectFuncRead(constants['LIQUIDATION_RATIO'], SystemSettings.instance().liquidationRatio);

    await SystemSettings.instance().setLiquidationPenalty(constants['LIQUIDATION_PENALTY']);
    await expectFuncRead(constants['LIQUIDATION_PENALTY'], SystemSettings.instance().liquidationPenalty);

    await SystemSettings.instance().setRateStalePeriod(constants['RATE_STALE_PERIOD']);
    await expectFuncRead(constants['RATE_STALE_PERIOD'], SystemSettings.instance().rateStalePeriod);

    await SystemSettings.instance().setMinimumStakeTime(constants['MINIMUM_STAKE_TIME']);
    await expectFuncRead(constants['MINIMUM_STAKE_TIME'], SystemSettings.instance().minimumStakeTime);

    await SystemSettings.instance().setDebtSnapshotStaleTime(constants['DEBT_SNAPSHOT_STALE_TIME']);
    await expectFuncRead(constants['DEBT_SNAPSHOT_STALE_TIME'], SystemSettings.instance().debtSnapshotStaleTime);

    await SystemSettings.instance().setCrossDomainMessageGasLimit(constants['CROSS_DOMAIN_MESSAGE_GAS_LIMIT']);
    await expectFuncRead(constants['CROSS_DOMAIN_MESSAGE_GAS_LIMIT'], SystemSettings.instance().crossDomainMessageGasLimit);

    // @ts-ignore
    if (checkIfExist(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+MORTAR_NETWORK_ID]])) {
      // @ts-ignore
      await SystemSettings.instance().setAggregatorWarningFlags(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+MORTAR_NETWORK_ID]]);
      await expectFuncRead(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+MORTAR_NETWORK_ID]], SystemSettings.instance().aggregatorWarningFlags);
    }
  });
});
