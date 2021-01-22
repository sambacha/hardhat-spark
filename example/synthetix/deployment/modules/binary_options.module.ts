import { module } from '../../../../src/interfaces/mortar';
import * as web3utils from 'web3-utils';
import path from 'path';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';
require('dotenv').config({path: path.resolve(__dirname + './../../.env')});

const {
  ETH_ADDRESS,
} = process.env;

export const BinaryOptionsModule = module('BinaryOptionsModule', async (m: SynthetixModuleBuilder) => {
  const day = 24 * 60 * 60;
  const maxOraclePriceAge = 120 * 60; // Price updates are accepted from up to two hours before maturity to allow for delayed chainlink heartbeats.
  const expiryDuration = 26 * 7 * day; // Six months to exercise options before the market is destructible.
  const maxTimeToMaturity = 730 * day; // Markets may not be deployed more than two years in the future.
  const creatorCapitalRequirement = web3utils.toWei('1000'); // 1000 sUSD is required to create a new market.
  const creatorSkewLimit = web3utils.toWei('0.05'); // Market creators must leave 5% or more of their position on either side.
  const poolFee = web3utils.toWei('0.008'); // 0.8% of the market's value goes to the pool in the end.
  const creatorFee = web3utils.toWei('0.002'); // 0.2% of the market's value goes to the creator.
  const refundFee = web3utils.toWei('0.05'); // 5% of a bid stays in the pot if it is refunded.

  const ReadProxyAddressResolver = m.ReadProxyAddressResolver;
  m.contract(
    'BinaryOptionMarketManager',
    ETH_ADDRESS,
    ReadProxyAddressResolver,
    maxOraclePriceAge,
    expiryDuration,
    maxTimeToMaturity,
    creatorCapitalRequirement,
    creatorSkewLimit,
    poolFee,
    creatorFee,
    refundFee
  );
});
