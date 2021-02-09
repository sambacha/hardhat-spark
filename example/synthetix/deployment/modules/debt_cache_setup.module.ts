import { ContractEvent, module, ModuleBuilder } from '../../../../src/interfaces/mortar';
import * as web3utils from 'web3-utils';
import { DEFAULTS } from '../../util/constants';

export const SynthetixDebtCacheSetup = module('SynthetixDebtCacheSetup', async (m: ModuleBuilder) => {
  const DebtCache = m.DebtCache;

  const afterDeploySystemSetting = m.afterDeploySystemSetting.event as ContractEvent;
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
    const cacheInfo = await DebtCache.instance().cacheInfo();
    const currentDebt = await DebtCache.instance().currentDebt();

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
