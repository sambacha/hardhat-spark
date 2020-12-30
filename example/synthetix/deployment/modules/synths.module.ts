import { ContractBinding, module, ModuleBuilder } from '../../../../src/interfaces/mortar';
import { SynthetixLibraries, SynthetixPrototypes } from './helper.module';
import { ethers } from 'ethers';
import { toBytes32 } from '../../util/util';
import { SynthetixCore } from './core.module';
import path from 'path';
require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

const {
  ETH_ADDRESS,
  MORTAR_NETWORK_ID
} = process.env;

export const SynthetixSynths = module('SynthetixSynths', async (m: ModuleBuilder) => {
  const libraries = await SynthetixLibraries;
  const prototypes = await SynthetixPrototypes;
  const core = await SynthetixCore;
  await m.bindModules(libraries, prototypes, core);
  const ExchangeRates = m.getBinding('ExchangeRates');

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
      m.getBinding('ReadProxyAddressResolver'),
      ...(additionalConstructorArgsMap[(sourceContractName + currencyKey)] || [])
    );

    m.group(Synth, TokenStateForSynth).afterDeploy(m, `afterDeploySynth${currencyKey}`, async (): Promise<void> => {
      await TokenStateForSynth.instance().setAssociatedContract(Synth);

      const associatedContract = await TokenStateForSynth.instance().associatedContract() as string;
      if (associatedContract != Synth?.deployMetaData?.contractAddress) {
        throw new Error('Address mismatch');
      }
    });

    m.group(Synth, ProxyForSynth).afterDeploy(m, `afterDeploySynthProxyForSynth${currencyKey}`, async (): Promise<void> => {
      await ProxyForSynth.instance().setTarget(Synth);

      const associatedContract = await ProxyForSynth.instance().target() as string;
      if (associatedContract != Synth?.deployMetaData?.contractAddress) {
        throw new Error('Address mismatch');
      }
    });

    if (proxyERC20ForSynth) {
      m.group(Synth, ProxyForSynth, proxyERC20ForSynth).afterDeploy(m, `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`, async (): Promise<void> => {
        await Synth.instance().setProxy(proxyERC20ForSynth); // @TODO should be just binding

        const associatedContract = await Synth.instance().proxy() as string;
        if (associatedContract != (proxyERC20ForSynth?.deployMetaData?.contractAddress)) {
          throw new Error('Address mismatch');
        }
      });

      m.group(proxyERC20ForSynth, ProxyForSynth, Synth).afterDeploy(m, `afterDeployProxyERC20ForSynth${currencyKey}`, async (): Promise<void> => {
        await ProxyForSynth.instance().setTarget(Synth);

        const target = await ProxyForSynth.instance().target() as string;
        if (target != (Synth?.deployMetaData?.contractAddress)) {
          throw new Error('Address mismatch');
        }
      });
    } else {
      m.group(Synth, ProxyForSynth).afterDeploy(m, `afterDeploySynthProxyForSynthProxyErc20ForSynthFirst${currencyKey}`, async (): Promise<void> => {
        await Synth.instance().setProxy(ProxyForSynth?.deployMetaData?.contractAddress);

        const associatedContract = await Synth.instance().proxy() as string;
        if (associatedContract != ProxyForSynth?.deployMetaData?.contractAddress) {
          throw new Error('Address mismatch');
        }
      });
    }

    const {feed} = feeds[asset] || {};
    if (ethers.utils.isAddress(feed)) {
      ExchangeRates.afterDeploy(m, `afterDeployExchangeRatesFeed${currencyKey}`, async (): Promise<void> => {
        await ExchangeRates.instance().addAggregator(currencyKeyInBytes, feed);

        const aggregator = await ExchangeRates.instance().aggregators(currencyKeyInBytes) as string;
        if (aggregator != feed) {
          throw new Error('Address mismatch');
        }
      });
    }
  }
});
