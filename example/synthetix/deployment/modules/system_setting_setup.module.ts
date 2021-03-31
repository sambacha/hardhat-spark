import {
  ContractBinding,
  ContractEvent,
  buildModule,
} from '../../../../src';
import { expectFuncRead } from '../../../../src';
import { toBytes32 } from '../../util/util';
import * as web3utils from 'web3-utils';
import { chainIdToNetwork, constants } from '../../util/constants';
import { checkIfExist } from '../../../../src/packages/utils/util';
import { ethers } from 'ethers';
import { SynthetixModuleBuilder } from '../SynthetixModule';

const {
  IGNITION_NETWORK_ID
} = process.env;

export const SystemSettingsModule = buildModule('SystemSettingsModule', async (m: SynthetixModuleBuilder) => {
  const synthsToAdd: { synth: ContractBinding, currencyKeyInBytes: string }[] = [];
  // @ts-ignore
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
      const feeRate = await SystemSettings.deployed().exchangeFeeRate(toBytes32(binding.name));

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
      await SystemSettings.deployed().setExchangeFeeRateForSynths(
        synthsRatesToUpdate.map(({name}) => toBytes32(name)),
        synthsRatesToUpdate.map(({targetRate}) => targetRate),
      );
    }

    await SystemSettings.deployed().setWaitingPeriodSecs(constants['WAITING_PERIOD_SECS']);
    await expectFuncRead(constants['WAITING_PERIOD_SECS'], SystemSettings.deployed().waitingPeriodSecs);

    await SystemSettings.deployed().setPriceDeviationThresholdFactor(constants['PRICE_DEVIATION_THRESHOLD_FACTOR']);
    await expectFuncRead(constants['PRICE_DEVIATION_THRESHOLD_FACTOR'], SystemSettings.deployed().priceDeviationThresholdFactor);

    await SystemSettings.deployed().setTradingRewardsEnabled(constants['TRADING_REWARDS_ENABLED']);
    await expectFuncRead(constants['TRADING_REWARDS_ENABLED'], SystemSettings.deployed().tradingRewardsEnabled);

    await SystemSettings.deployed().setIssuanceRatio(constants['ISSUANCE_RATIO']);
    await expectFuncRead(constants['ISSUANCE_RATIO'], SystemSettings.deployed().issuanceRatio);

    await SystemSettings.deployed().setFeePeriodDuration(constants['FEE_PERIOD_DURATION']);
    await expectFuncRead(constants['FEE_PERIOD_DURATION'], SystemSettings.deployed().feePeriodDuration);

    await SystemSettings.deployed().setTargetThreshold(constants['TARGET_THRESHOLD']);
    await expectFuncRead(
      ethers.BigNumber.from(constants['TARGET_THRESHOLD']).mul('10000000000000000').toString()
      , SystemSettings.deployed().targetThreshold);

    await SystemSettings.deployed().setLiquidationDelay(constants['LIQUIDATION_DELAY']);
    await expectFuncRead(constants['LIQUIDATION_DELAY'], SystemSettings.deployed().liquidationDelay);

    await SystemSettings.deployed().setLiquidationRatio(constants['LIQUIDATION_RATIO']);
    await expectFuncRead(constants['LIQUIDATION_RATIO'], SystemSettings.deployed().liquidationRatio);

    await SystemSettings.deployed().setLiquidationPenalty(constants['LIQUIDATION_PENALTY']);
    await expectFuncRead(constants['LIQUIDATION_PENALTY'], SystemSettings.deployed().liquidationPenalty);

    await SystemSettings.deployed().setRateStalePeriod(constants['RATE_STALE_PERIOD']);
    await expectFuncRead(constants['RATE_STALE_PERIOD'], SystemSettings.deployed().rateStalePeriod);

    await SystemSettings.deployed().setMinimumStakeTime(constants['MINIMUM_STAKE_TIME']);
    await expectFuncRead(constants['MINIMUM_STAKE_TIME'], SystemSettings.deployed().minimumStakeTime);

    await SystemSettings.deployed().setDebtSnapshotStaleTime(constants['DEBT_SNAPSHOT_STALE_TIME']);
    await expectFuncRead(constants['DEBT_SNAPSHOT_STALE_TIME'], SystemSettings.deployed().debtSnapshotStaleTime);

    await SystemSettings.deployed().setCrossDomainMessageGasLimit(constants['CROSS_DOMAIN_MESSAGE_GAS_LIMIT']);
    await expectFuncRead(constants['CROSS_DOMAIN_MESSAGE_GAS_LIMIT'], SystemSettings.deployed().crossDomainMessageGasLimit);

    // @ts-ignore
    if (checkIfExist(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+IGNITION_NETWORK_ID]])) {
      // @ts-ignore
      await SystemSettings.deployed().setAggregatorWarningFlags(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+IGNITION_NETWORK_ID]]);
      await expectFuncRead(constants['AGGREGATOR_WARNING_FLAGS'][chainIdToNetwork[+IGNITION_NETWORK_ID]], SystemSettings.deployed().aggregatorWarningFlags);
    }
  });
});
