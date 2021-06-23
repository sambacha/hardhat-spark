import * as dotenv from "dotenv";
import { buildModule } from "ignition-core";
import * as path from "path";
import * as web3utils from "web3-utils";

import { toBytes32 } from "../../util/util";
import { SynthetixModuleBuilder } from "../SynthetixModule";

dotenv.config({ path: path.resolve(`${__dirname} ./../../.env`) });

export const SynthetixInverseSynths = buildModule(
  "SynthetixInverseSynths",
  async (m: SynthetixModuleBuilder) => {
    const ExchangeRates = m.ExchangeRates;
    for (const { name: currencyKey, inverted } of m.synths as any) {
      if (inverted) {
        const { entryPoint, upperLimit, lowerLimit } = inverted;

        const setInversePricing = ({
          freezeAtUpperLimit,
          freezeAtLowerLimit,
        }: {
          freezeAtUpperLimit: boolean;
          freezeAtLowerLimit: boolean;
        }) =>
          ExchangeRates.afterDeploy(
            m,
            `afterDeployExchangeRatesSynth${currencyKey}`,
            async (): Promise<void> => {
              await ExchangeRates.deployed().setInversePricing(
                toBytes32(currencyKey),
                web3utils.toWei(entryPoint.toString()),
                web3utils.toWei(upperLimit.toString()),
                web3utils.toWei(lowerLimit.toString()),
                freezeAtUpperLimit,
                freezeAtLowerLimit
              );
            }
          );

        await setInversePricing({
          freezeAtUpperLimit: false,
          freezeAtLowerLimit: false,
        });
      }
    }
  }
);
