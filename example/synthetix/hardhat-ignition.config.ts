import { HardhatIgnitionConfig } from '../../src';
import * as web3utils from 'web3-utils';
import { ethers } from 'ethers';
import path from 'path';

require('dotenv').config({path: path.resolve(__dirname + '/.env')});

const {
  ETH_ADDRESS
} = process.env;

export const config: HardhatIgnitionConfig = {
  params: {
    day: 24 * 60 * 60,
    maxOraclePriceAge: 120 * 60, // Price updates are accepted from up to two hours before maturity to allow for delayed chainlink heartbeats.
    expiryDuration: 26 * 7 * 24 * 60 * 60, // Six months to exercise options before the market is destructible.
    maxTimeToMaturity: 730 * 24 * 60 * 60, // Markets may not be deployed more than two years in the future.
    creatorCapitalRequirement: web3utils.toWei('1000'), // 1000 sUSD is required to create a new market.
    creatorSkewLimit: web3utils.toWei('0.05'), // Market creators must leave 5% or more of their position on either side.
    poolFee: web3utils.toWei('0.008'), // 0.8% of the market's value goes to the pool in the end.
    creatorFee: web3utils.toWei('0.002'), // 0.2% of the market's value goes to the creator.
    refundFee: web3utils.toWei('0.05'), // 5% of a bid stays in the pot if it is refunded.
    oracleExRatesContractAddress: ETH_ADDRESS,
    ETH_ADDRESS: ETH_ADDRESS,
    useOvm: false,
    currentSynthetixSupply: ethers.BigNumber.from('100000'),
    currentWeekOfInflation: 0,
    currentLastMintEvent: 0,
    inflationStartDate: (Math.round(new Date().getTime() / 1000) - 3600 * 24 * 7).toString(),
    fixedPeriodicSupply: web3utils.toWei('50000'),
    mintPeriod: (3600 * 24 * 7),
    mintBuffer: '600',
    minterReward: web3utils.toWei('100'),
    supplyEnd: '5',
    synths: [
      {
        'name': 'sUSD',
        'asset': 'USD',
        'subclass': 'MultiCollateralSynth'
      },
      {
        'name': 'sEUR',
        'asset': 'EUR'
      },
      {
        'name': 'sJPY',
        'asset': 'JPY'
      },
      {
        'name': 'sAUD',
        'asset': 'AUD'
      },
      {
        'name': 'sGBP',
        'asset': 'GBP',
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'sCHF',
        'asset': 'CHF',
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'sXAU',
        'asset': 'XAU',
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'sXAG',
        'asset': 'XAG'
      },
      {
        'name': 'sBTC',
        'asset': 'BTC'
      },
      {
        'name': 'sETH',
        'asset': 'ETH',
        'subclass': 'MultiCollateralSynth'
      },
      {
        'name': 'sBNB',
        'asset': 'BNB'
      },
      {
        'name': 'sTRX',
        'asset': 'TRX'
      },
      {
        'name': 'sXTZ',
        'asset': 'XTZ'
      },
      {
        'name': 'sXRP',
        'asset': 'XRP'
      },
      {
        'name': 'sLTC',
        'asset': 'LTC',
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'sLINK',
        'asset': 'LINK'
      },
      {
        'name': 'sEOS',
        'asset': 'EOS'
      },
      {
        'name': 'sBCH',
        'asset': 'BCH'
      },
      {
        'name': 'sETC',
        'asset': 'ETC'
      },
      {
        'name': 'sDASH',
        'asset': 'DASH'
      },
      {
        'name': 'sXMR',
        'asset': 'XMR'
      },
      {
        'name': 'sADA',
        'asset': 'ADA'
      },
      {
        'name': 'sCEX',
        'asset': 'CEX',
        'index': [
          {
            'asset': 'BNB',
            'units': 12.88,
            'weight': 29.15
          },
          {
            'asset': 'CRO',
            'units': 1303.31,
            'weight': 24.3
          },
          {
            'asset': 'LEO',
            'units': 94.54,
            'weight': 13.42
          },
          {
            'asset': 'HT',
            'units': 23.06,
            'weight': 11.73
          },
          {
            'asset': 'FTT',
            'units': 9.36,
            'weight': 3.56
          },
          {
            'asset': 'OKB',
            'units': 25.72,
            'weight': 16.97
          },
          {
            'asset': 'KCS',
            'units': 9.18,
            'weight': 0.87
          }
        ],
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'sDEFI',
        'asset': 'DEFI',
        'index': [
          {
            'asset': 'COMP',
            'units': 4.14,
            'weight': 20.5
          },
          {
            'asset': 'MKR',
            'units': 0.74,
            'weight': 15.0
          },
          {
            'asset': 'ZRX',
            'units': 668.16,
            'weight': 9.7
          },
          {
            'asset': 'REP',
            'units': 9.52,
            'weight': 7.2
          },
          {
            'asset': 'LEND',
            'units': 581.76,
            'weight': 6.7
          },
          {
            'asset': 'UMA',
            'units': 28.54,
            'weight': 4.2
          },
          {
            'asset': 'SNX',
            'units': 82.84,
            'weight': 10.2
          },
          {
            'asset': 'REN',
            'units': 822.92,
            'weight': 5.0
          },
          {
            'asset': 'LRC',
            'units': 948.31,
            'weight': 3.8
          },
          {
            'asset': 'KNC',
            'units': 224.53,
            'weight': 11.8
          },
          {
            'asset': 'BNT',
            'units': 61.2,
            'weight': 3.4
          },
          {
            'asset': 'BAL',
            'units': 7.09,
            'weight': 2.5
          }
        ],
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'iBTC',
        'asset': 'BTC',
        'inverted': {
          'entryPoint': 10600,
          'upperLimit': 15900,
          'lowerLimit': 5300
        },
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'iETH',
        'asset': 'ETH',
        'inverted': {
          'entryPoint': 180.16,
          'upperLimit': 315.28,
          'lowerLimit': 45.04
        },
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'iBNB',
        'asset': 'BNB',
        'inverted': {
          'entryPoint': 29,
          'upperLimit': 44,
          'lowerLimit': 14.5
        },
        'subclass': 'PurgeableSynth'
      },
      {
        'name': 'iTRX',
        'asset': 'TRX',
        'subclass': 'PurgeableSynth',
        'inverted': {
          'entryPoint': 0.025,
          'upperLimit': 0.0375,
          'lowerLimit': 0.0125
        }
      },
      {
        'name': 'iXTZ',
        'asset': 'XTZ',
        'subclass': 'PurgeableSynth',
        'inverted': {
          'entryPoint': 1.4,
          'upperLimit': 2.1,
          'lowerLimit': 0.7
        }
      },
      {
        'name': 'iCEX',
        'asset': 'CEX',
        'index': 'sCEX',
        'subclass': 'PurgeableSynth',
        'inverted': {
          'entryPoint': 1000,
          'upperLimit': 1500,
          'lowerLimit': 500
        }
      },
      {
        'name': 'iDEFI',
        'asset': 'DEFI',
        'index': 'sDEFI',
        'subclass': 'PurgeableSynth',
        'inverted': {
          'entryPoint': 2757.0,
          'upperLimit': 4135.5,
          'lowerLimit': 1378.5
        }
      },
      {
        'name': 'sFTSE',
        'asset': 'FTSE100'
      },
      {
        'name': 'sNIKKEI',
        'asset': 'NIKKEI225'
      }
    ],
    feeds: {
      'SNX': {'asset': 'SNX', 'feed': '0x0'},
      'ETH': {'asset': 'ETH', 'feed': '0x0'},
      'COMP': {'asset': 'COMP', 'feed': '0x0'},
      'KNC': {'asset': 'KNC', 'feed': '0x0'},
      'REN': {'asset': 'REN', 'feed': '0x0'},
      'BTC': {'asset': 'BTC', 'feed': '0x0'},
      'BNB': {'asset': 'BNB', 'feed': '0x0'},
      'TRX': {'asset': 'TRX', 'feed': '0x0'},
      'XTZ': {'asset': 'XTZ', 'feed': '0x0'},
      'XRP': {'asset': 'XRP', 'feed': '0x0'},
      'LTC': {'asset': 'LTC', 'feed': '0x0'},
      'LINK': {'asset': 'LINK', 'feed': '0x0'},
      'EOS': {'asset': 'EOS', 'feed': '0x0'},
      'BCH': {'asset': 'BCH', 'feed': '0x0'},
      'ETC': {'asset': 'ETC', 'feed': '0x0'},
      'DASH': {'asset': 'DASH', 'feed': '0x0'},
      'XMR': {'asset': 'XMR', 'feed': '0x0'},
      'ADA': {'asset': 'ADA', 'feed': '0x0'},
      'CEX': {'asset': 'CEX', 'feed': '0x0'},
      'DEFI': {'asset': 'DEFI', 'feed': '0x0'},
      'EUR': {'asset': 'EUR', 'feed': '0x0'},
      'JPY': {'asset': 'JPY', 'feed': '0x0'},
      'AUD': {'asset': 'AUD', 'feed': '0x0'},
      'GBP': {'asset': 'GBP', 'feed': '0x0'},
      'CHF': {'asset': 'CHF', 'feed': '0x0'},
      'XAU': {'asset': 'XAU', 'feed': '0x0'},
      'XAG': {'asset': 'XAG', 'feed': '0x0'},
      'FTSE100': {'asset': 'FTSE100', 'feed': '0x0'},
      'NIKKEI225': {'asset': 'NIKKEI225', 'feed': '0x0'}
    }
  }
};
