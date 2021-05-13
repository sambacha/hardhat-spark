import { sendAfterDeploy, ContractBinding, buildModule } from 'ignition-core';
import { ethers } from 'ethers';
import { toBytes32 } from '../../util/util';
import { SynthetixModuleBuilder } from '../SynthetixModule';

const {
  IGNITION_NETWORK_ID
} = process.env;

export const SynthetixSynths = buildModule('SynthetixSynths', async (m: SynthetixModuleBuilder) => {
  const ExchangeRates = m.ExchangeRates;

  // @ts-ignore
  for (const {name: currencyKey, subclass, asset} of m.synths) {
    const TokenStateForSynth = m.bindTemplate(`TokenState${currencyKey}`, 'TokenState', m.ETH_ADDRESS, ethers.constants.AddressZero);

    const synthProxyIsLegacy = currencyKey === 'sUSD' && IGNITION_NETWORK_ID === '1';

    const ProxyForSynth = m.bindTemplate(
      `Proxy${currencyKey}`,
      synthProxyIsLegacy ? 'Proxy' : 'ProxyERC20',
      m.ETH_ADDRESS
    );

    let proxyERC20ForSynth: ContractBinding | undefined;
    if (currencyKey === 'sUSD') {
      proxyERC20ForSynth = m.bindTemplate(`ProxyERC20${currencyKey}`, 'ProxyERC20', m.ETH_ADDRESS);
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

    const Synth = m.bindTemplate(
      `Synth${currencyKey}`,
      sourceContractName,
      proxyERC20ForSynth ? proxyERC20ForSynth : ProxyForSynth,
      TokenStateForSynth,
      `Synth ${currencyKey}`,
      currencyKey,
      m.ETH_ADDRESS,
      currencyKeyInBytes,
      originalTotalSupply,
      m.ReadProxyAddressResolver,
      ...(additionalConstructorArgsMap[(sourceContractName + currencyKey)] || [])
    );

    sendAfterDeploy(m,
      TokenStateForSynth,
      'setAssociatedContract',
      [Synth],
      {
        eventName: `afterDeploySynth${currencyKey}`,
      }
    );

    sendAfterDeploy(m,
      ProxyForSynth,
      'setTarget',
      [Synth],
      {
        eventName: `afterDeploySynthProxyForSynth${currencyKey}`,
      }
    );

    if (proxyERC20ForSynth) {
      sendAfterDeploy(m,
        Synth,
        'setProxy',
        [proxyERC20ForSynth],
        {
          eventName: `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`
        }
      );

      sendAfterDeploy(m,
        ProxyForSynth,
        'setTarget',
        [Synth],
        {
          eventName: `afterDeployProxyERC20ForSynth${currencyKey}`,
        }
      );
    } else {
      sendAfterDeploy(m,
        Synth,
        'setProxy',
        [ProxyForSynth],
        {
          eventName: `afterDeployProxyERC20ForSynth${currencyKey}`,
        }
      );
    }

    const {feed} = (m.feeds as {[feedName: string]: any})[asset] || {};
    if (ethers.utils.isAddress(feed)) {
      sendAfterDeploy(m,
        ExchangeRates,
        'setProxy',
        [currencyKeyInBytes, feed],
        {
          eventName: `afterDeployExchangeRatesFeed${currencyKey}`,
        }
      );
    }
  }
});
