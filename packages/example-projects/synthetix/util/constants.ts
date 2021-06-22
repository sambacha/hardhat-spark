import * as web3utils from 'web3-utils';

export const chainIdToNetwork: {[networkId: number]: string} = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'goerli',
  42: 'kovan',
};

export const constants = {
  WAITING_PERIOD_SECS: (60 * 5).toString(), // 5 mins
  PRICE_DEVIATION_THRESHOLD_FACTOR: web3utils.toWei('3'),
  TRADING_REWARDS_ENABLED: false,
  ISSUANCE_RATIO: web3utils
    .toBN(1)
    .mul(web3utils.toBN(1e18))
    .div(web3utils.toBN(6))
    .toString(), // 1/6 = 0.16666666667
  FEE_PERIOD_DURATION: (3600 * 24 * 7).toString(), // 1 week
  TARGET_THRESHOLD: '1', // 1% target threshold (it will be converted to a decimal when set)
  LIQUIDATION_DELAY: (3600 * 24 * 3).toString(), // 3 days
  LIQUIDATION_RATIO: web3utils.toWei('0.5'), // 200% cratio
  LIQUIDATION_PENALTY: web3utils.toWei('0.1'), // 10% penalty
  RATE_STALE_PERIOD: (3600 * 25).toString(), // 25 hours
  EXCHANGE_FEE_RATES: {
    forex: web3utils.toWei('0.003'),
    commodity: web3utils.toWei('0.003'),
    equities: web3utils.toWei('0.003'),
    crypto: web3utils.toWei('0.01'),
    index: web3utils.toWei('0.01'),
  },
  MINIMUM_STAKE_TIME: (3600 * 24).toString(), // 1 days
  DEBT_SNAPSHOT_STALE_TIME: (43800).toString(), // 12 hour heartbeat + 10 minutes mining time
  AGGREGATOR_WARNING_FLAGS: {
    mainnet: '0x4A5b9B4aD08616D11F3A402FF7cBEAcB732a76C6',
    kovan: '0x6292aa9a6650ae14fbf974e5029f36f95a1848fd',
  },
  INITIAL_ISSUANCE: web3utils.toWei(`${100e6}`),
  CROSS_DOMAIN_MESSAGE_GAS_LIMIT: `${3e6}`,
};

export const DEFAULTS = {
  gasPrice: '1',
  methodCallGasLimit: 250e3, // 250k
  contractDeploymentGasLimit: 6.9e6, // TODO split out into separate limits for different contracts, Proxys, Synths, Synthetix
  debtSnapshotMaxDeviation: 0.01, // a 1 percent deviation will trigger a snapshot
  network: 'kovan',
};
