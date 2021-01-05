import { ContractBinding, expectFuncRead, module } from '../../../../src/interfaces/mortar';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import { ethers } from 'ethers';
import { toBytes32 } from '../../util/util';
import { SynthetixCore } from './core.module';
import path from 'path';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';
require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

const {
  ETH_ADDRESS,
  MORTAR_NETWORK_ID
} = process.env;

export const SynthetixSynths = module('SynthetixSynths', async (m: SynthetixModuleBuilder) => {
  await m.bindModule(SynthetixLibraries);
  await m.bindModule(SynthetixPrototypes);
  await m.bindModule(SynthetixCore);
  const ExchangeRates = m.ExchangeRates;

  const synths = require('./../local/synths.json');
  const feeds = require('./../local/feeds.json');

  for (const {name: currencyKey, subclass, asset} of synths) {
    const TokenStateForSynth = m.bindPrototype(`TokenState${currencyKey}`, 'TokenState', ETH_ADDRESS, ethers.constants.AddressZero);

    const synthProxyIsLegacy = currencyKey === 'sUSD' && MORTAR_NETWORK_ID === '1';

    const ProxyForSynth = m.bindPrototype(
      `Proxy${currencyKey}`,
      synthProxyIsLegacy ? 'Proxy' : 'ProxyERC20',
      ETH_ADDRESS
    );

    let proxyERC20ForSynth: ContractBinding | undefined;
    if (currencyKey === 'sUSD') {
      proxyERC20ForSynth = m.bindPrototype(`ProxyERC20${currencyKey}`, 'ProxyERC20', ETH_ADDRESS);
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
      ETH_ADDRESS,
      currencyKeyInBytes,
      originalTotalSupply,
      m.ReadProxyAddressResolver,
      ...(additionalConstructorArgsMap[(sourceContractName + currencyKey)] || [])
    );

    m.group(Synth, TokenStateForSynth).afterDeploy(m, `afterDeploySynth${currencyKey}`, async (): Promise<void> => {
      await TokenStateForSynth.instance().setAssociatedContract(Synth);

      await expectFuncRead(Synth, TokenStateForSynth.instance().associatedContract);
    });

    m.group(Synth, ProxyForSynth).afterDeploy(m, `afterDeploySynthProxyForSynth${currencyKey}`, async (): Promise<void> => {
      await ProxyForSynth.instance().setTarget(Synth);

      await expectFuncRead(Synth, ProxyForSynth.instance().target);
    });

    if (proxyERC20ForSynth) {
      m.group(Synth, ProxyForSynth, proxyERC20ForSynth).afterDeploy(m, `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`, async (): Promise<void> => {
        await Synth.instance().setProxy(proxyERC20ForSynth);

        await expectFuncRead(proxyERC20ForSynth, Synth.instance().proxy);
      });

      m.group(proxyERC20ForSynth, ProxyForSynth, Synth).afterDeploy(m, `afterDeployProxyERC20ForSynth${currencyKey}`, async (): Promise<void> => {
        await ProxyForSynth.instance().setTarget(Synth);

        await expectFuncRead(Synth, ProxyForSynth.instance().target);
      });
    } else {
      m.group(Synth, ProxyForSynth).afterDeploy(m, `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`, async (): Promise<void> => {
        await Synth.instance().setProxy(ProxyForSynth?.deployMetaData?.contractAddress);

        await expectFuncRead(ProxyForSynth, Synth.instance().proxy);
      });
    }

    const {feed} = feeds[asset] || {};
    if (ethers.utils.isAddress(feed)) {
      ExchangeRates.afterDeploy(m, `afterDeployExchangeRatesFeed${currencyKey}`, async (): Promise<void> => {
        await ExchangeRates.instance().addAggregator(currencyKeyInBytes, feed);

        await expectFuncRead(feed, ExchangeRates.instance().aggregators, currencyKeyInBytes);
      });
    }
  }
});
