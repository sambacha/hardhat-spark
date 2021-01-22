import { module, ModuleBuilder } from '../../../../src/interfaces/mortar';

import path from 'path';
import { toBytes32 } from '../../util/util';
import * as web3utils from 'web3-utils';

require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

export const SynthetixInverseSynths = module('SynthetixInverseSynths', async (m: ModuleBuilder) => {
  const ExchangeRates = m.ExchangeRates;
  const synths = require('../local/synths.json');
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


      await setInversePricing({freezeAtUpperLimit: false, freezeAtLowerLimit: false});
    }
  }
});
