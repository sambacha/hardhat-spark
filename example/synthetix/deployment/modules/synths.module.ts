import { ContractBinding, buildModule } from '../../../../src';
import { ethers } from 'ethers';
import { toBytes32 } from '../../util/util';
import { mutator } from '../../../../src';
import { SynthetixModuleBuilder } from '../SynthetixModule';

const {
  IGNITION_NETWORK_ID
} = process.env;

export const SynthetixSynths = buildModule('SynthetixSynths', async (m: SynthetixModuleBuilder) => {
  const ExchangeRates = m.ExchangeRates;

  // @ts-ignore
  for (const {name: currencyKey, subclass, asset} of m.synths) {
    const TokenStateForSynth = m.bindPrototype(`TokenState${currencyKey}`, 'TokenState', m.ETH_ADDRESS, ethers.constants.AddressZero);

    const synthProxyIsLegacy = currencyKey === 'sUSD' && IGNITION_NETWORK_ID === '1';

    const ProxyForSynth = m.bindPrototype(
      `Proxy${currencyKey}`,
      synthProxyIsLegacy ? 'Proxy' : 'ProxyERC20',
      m.ETH_ADDRESS
    );

    let proxyERC20ForSynth: ContractBinding | undefined;
    if (currencyKey === 'sUSD') {
      proxyERC20ForSynth = m.bindPrototype(`ProxyERC20${currencyKey}`, 'ProxyERC20', m.ETH_ADDRESS);
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

    mutator(m,
      TokenStateForSynth,
      'setAssociatedContract',
      [Synth],
      {
        name: `afterDeploySynth${currencyKey}`,
      }
    );

    mutator(m,
      ProxyForSynth,
      'setTarget',
      [Synth],
      {
        name: `afterDeploySynthProxyForSynth${currencyKey}`,
      }
    );

    if (proxyERC20ForSynth) {
      mutator(m,
        Synth,
        'setProxy',
        [proxyERC20ForSynth],
        {
          name: `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`
        }
      );

      mutator(m,
        ProxyForSynth,
        'setTarget',
        [Synth],
        {
          name: `afterDeployProxyERC20ForSynth${currencyKey}`,
        }
      );
    } else {
      mutator(m,
        Synth,
        'setProxy',
        [ProxyForSynth],
        {
          name: `afterDeployProxyERC20ForSynth${currencyKey}`,
        }
      );
    }

    const {feed} = m.feeds[asset] || {};
    if (ethers.utils.isAddress(feed)) {
      mutator(m,
        ExchangeRates,
        'setProxy',
        [currencyKeyInBytes, feed],
        {
          name: `afterDeployExchangeRatesFeed${currencyKey}`,
        }
      );
    }
  }
});
