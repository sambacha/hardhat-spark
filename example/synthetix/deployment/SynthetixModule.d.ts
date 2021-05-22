import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from 'ignition-core';

export declare class SynthetixModuleBuilder extends ModuleBuilder {
  SafeDecimalMath: ContractBinding;
  Math: ContractBinding;
  AddressResolver: ContractBinding;
  ReadProxyAddressResolver: ContractBinding;
  FlexibleStorage: ContractBinding;
  SystemSettings: ContractBinding;
  SystemStatus: ContractBinding;
  ExchangeRates: ContractBinding;
  RewardEscrow: ContractBinding;
  SynthetixEscrow: ContractBinding;
  SynthetixState: ContractBinding;
  ProxyFeePool: ContractBinding;
  DelegateApprovalsEternalStorage: ContractBinding;
  DelegateApprovals: ContractBinding;
  Liquidations: ContractBinding;
  EternalStorageLiquidations: ContractBinding;
  FeePoolEternalStorage: ContractBinding;
  FeePool: ContractBinding;
  FeePoolState: ContractBinding;
  RewardsDistribution: ContractBinding;
  ProxyERC20Synthetix: ContractBinding;
  TokenStateSynthetix: ContractBinding;
  Synthetix: ContractBinding;
  ProxySynthetix: ContractBinding;
  DebtCache: ContractBinding;
  Exchanger: ContractBinding;
  ExchangeState: ContractBinding;
  Issuer: ContractBinding;
  TradingRewards: ContractBinding;
  EscrowChecker: ContractBinding;
  SupplySchedule: ContractBinding;
  TokenStatesUSD: ContractBinding;
  ProxysUSD: ContractBinding;
  ProxyERC20sUSD: ContractBinding;
  SynthsUSD: ContractBinding;
  TokenStatesEUR: ContractBinding;
  ProxysEUR: ContractBinding;
  SynthsEUR: ContractBinding;
  TokenStatesJPY: ContractBinding;
  ProxysJPY: ContractBinding;
  SynthsJPY: ContractBinding;
  TokenStatesAUD: ContractBinding;
  ProxysAUD: ContractBinding;
  SynthsAUD: ContractBinding;
  TokenStatesGBP: ContractBinding;
  ProxysGBP: ContractBinding;
  SynthsGBP: ContractBinding;
  TokenStatesCHF: ContractBinding;
  ProxysCHF: ContractBinding;
  SynthsCHF: ContractBinding;
  TokenStatesXAU: ContractBinding;
  ProxysXAU: ContractBinding;
  SynthsXAU: ContractBinding;
  TokenStatesXAG: ContractBinding;
  ProxysXAG: ContractBinding;
  SynthsXAG: ContractBinding;
  TokenStatesBTC: ContractBinding;
  ProxysBTC: ContractBinding;
  SynthsBTC: ContractBinding;
  TokenStatesETH: ContractBinding;
  ProxysETH: ContractBinding;
  SynthsETH: ContractBinding;
  TokenStatesBNB: ContractBinding;
  ProxysBNB: ContractBinding;
  SynthsBNB: ContractBinding;
  TokenStatesTRX: ContractBinding;
  ProxysTRX: ContractBinding;
  SynthsTRX: ContractBinding;
  TokenStatesXTZ: ContractBinding;
  ProxysXTZ: ContractBinding;
  SynthsXTZ: ContractBinding;
  TokenStatesXRP: ContractBinding;
  ProxysXRP: ContractBinding;
  SynthsXRP: ContractBinding;
  TokenStatesLTC: ContractBinding;
  ProxysLTC: ContractBinding;
  SynthsLTC: ContractBinding;
  TokenStatesLINK: ContractBinding;
  ProxysLINK: ContractBinding;
  SynthsLINK: ContractBinding;
  TokenStatesEOS: ContractBinding;
  ProxysEOS: ContractBinding;
  SynthsEOS: ContractBinding;
  TokenStatesBCH: ContractBinding;
  ProxysBCH: ContractBinding;
  SynthsBCH: ContractBinding;
  TokenStatesETC: ContractBinding;
  ProxysETC: ContractBinding;
  SynthsETC: ContractBinding;
  TokenStatesDASH: ContractBinding;
  ProxysDASH: ContractBinding;
  SynthsDASH: ContractBinding;
  TokenStatesXMR: ContractBinding;
  ProxysXMR: ContractBinding;
  SynthsXMR: ContractBinding;
  TokenStatesADA: ContractBinding;
  ProxysADA: ContractBinding;
  SynthsADA: ContractBinding;
  TokenStatesCEX: ContractBinding;
  ProxysCEX: ContractBinding;
  SynthsCEX: ContractBinding;
  TokenStatesDEFI: ContractBinding;
  ProxysDEFI: ContractBinding;
  SynthsDEFI: ContractBinding;
  TokenStateiBTC: ContractBinding;
  ProxyiBTC: ContractBinding;
  SynthiBTC: ContractBinding;
  TokenStateiETH: ContractBinding;
  ProxyiETH: ContractBinding;
  SynthiETH: ContractBinding;
  TokenStateiBNB: ContractBinding;
  ProxyiBNB: ContractBinding;
  SynthiBNB: ContractBinding;
  TokenStateiTRX: ContractBinding;
  ProxyiTRX: ContractBinding;
  SynthiTRX: ContractBinding;
  TokenStateiXTZ: ContractBinding;
  ProxyiXTZ: ContractBinding;
  SynthiXTZ: ContractBinding;
  TokenStateiCEX: ContractBinding;
  ProxyiCEX: ContractBinding;
  SynthiCEX: ContractBinding;
  TokenStateiDEFI: ContractBinding;
  ProxyiDEFI: ContractBinding;
  SynthiDEFI: ContractBinding;
  TokenStatesFTSE: ContractBinding;
  ProxysFTSE: ContractBinding;
  SynthsFTSE: ContractBinding;
  TokenStatesNIKKEI: ContractBinding;
  ProxysNIKKEI: ContractBinding;
  SynthsNIKKEI: ContractBinding;
  BinaryOptionMarketManager: ContractBinding;
  SynthUtil: ContractBinding;
  DappMaintenance: ContractBinding;
  BinaryOptionMarketData: ContractBinding;
  Depot: ContractBinding;
  EtherCollateral: ContractBinding;
  EtherCollateralsUSD: ContractBinding;
  SynthetixBridgeToOptimism: ContractBinding;
  BinaryOptionMarketFactory: ContractBinding;
  mutatorsetTargetReadProxyAddressResolver: StatefulEvent;
  mutatorsetAssociatedContractDelegateApprovalsEternalStorage: StatefulEvent;
  mutatorsetAssociatedContractEternalStorageLiquidations: StatefulEvent;
  mutatorsetAssociatedContractFeePoolEternalStorage: StatefulEvent;
  mutatorsetTargetProxyFeePool: StatefulEvent;
  mutatorsetFeePoolFeePoolState: StatefulEvent;
  mutatorsetTargetProxyERC20Synthetix: StatefulEvent;
  mutatorsetProxySynthetix: StatefulEvent;
  mutatorsetTargetProxySynthetix: StatefulEvent;
  mutatorsetAssociatedContractExchangeState: StatefulEvent;
  mutatorupdateAccessControlSystemStatus: StatefulEvent;
  mutatorsetBalanceOfTokenStateSynthetix: StatefulEvent;
  mutatorsetAssociatedContractTokenStateSynthetix: StatefulEvent;
  mutatorsetAssociatedContractSynthetixState: StatefulEvent;
  mutatorsetSynthetixRewardEscrow: StatefulEvent;
  mutatorsetFeePoolRewardEscrow: StatefulEvent;
  mutatorsetSynthetixProxySupplySchedule: StatefulEvent;
  mutatorsetAuthorityRewardsDistribution: StatefulEvent;
  mutatorsetSynthetixProxyRewardsDistribution: StatefulEvent;
  mutatorsetSynthetixSynthetixEscrow: StatefulEvent;
  afterDeploySynthsUSD: StatefulEvent;
  afterDeploySynthProxyForSynthsUSD: StatefulEvent;
  afterDeploySynthProxyForSynthProxyErc20ForSynthFirstsUSD: StatefulEvent;
  afterDeployProxyERC20ForSynthsUSD: StatefulEvent;
  afterDeploySynthsEUR: StatefulEvent;
  afterDeploySynthProxyForSynthsEUR: StatefulEvent;
  afterDeployProxyERC20ForSynthsEUR: StatefulEvent;
  afterDeploySynthsJPY: StatefulEvent;
  afterDeploySynthProxyForSynthsJPY: StatefulEvent;
  afterDeployProxyERC20ForSynthsJPY: StatefulEvent;
  afterDeploySynthsAUD: StatefulEvent;
  afterDeploySynthProxyForSynthsAUD: StatefulEvent;
  afterDeployProxyERC20ForSynthsAUD: StatefulEvent;
  afterDeploySynthsGBP: StatefulEvent;
  afterDeploySynthProxyForSynthsGBP: StatefulEvent;
  afterDeployProxyERC20ForSynthsGBP: StatefulEvent;
  afterDeploySynthsCHF: StatefulEvent;
  afterDeploySynthProxyForSynthsCHF: StatefulEvent;
  afterDeployProxyERC20ForSynthsCHF: StatefulEvent;
  afterDeploySynthsXAU: StatefulEvent;
  afterDeploySynthProxyForSynthsXAU: StatefulEvent;
  afterDeployProxyERC20ForSynthsXAU: StatefulEvent;
  afterDeploySynthsXAG: StatefulEvent;
  afterDeploySynthProxyForSynthsXAG: StatefulEvent;
  afterDeployProxyERC20ForSynthsXAG: StatefulEvent;
  afterDeploySynthsBTC: StatefulEvent;
  afterDeploySynthProxyForSynthsBTC: StatefulEvent;
  afterDeployProxyERC20ForSynthsBTC: StatefulEvent;
  afterDeploySynthsETH: StatefulEvent;
  afterDeploySynthProxyForSynthsETH: StatefulEvent;
  afterDeployProxyERC20ForSynthsETH: StatefulEvent;
  afterDeploySynthsBNB: StatefulEvent;
  afterDeploySynthProxyForSynthsBNB: StatefulEvent;
  afterDeployProxyERC20ForSynthsBNB: StatefulEvent;
  afterDeploySynthsTRX: StatefulEvent;
  afterDeploySynthProxyForSynthsTRX: StatefulEvent;
  afterDeployProxyERC20ForSynthsTRX: StatefulEvent;
  afterDeploySynthsXTZ: StatefulEvent;
  afterDeploySynthProxyForSynthsXTZ: StatefulEvent;
  afterDeployProxyERC20ForSynthsXTZ: StatefulEvent;
  afterDeploySynthsXRP: StatefulEvent;
  afterDeploySynthProxyForSynthsXRP: StatefulEvent;
  afterDeployProxyERC20ForSynthsXRP: StatefulEvent;
  afterDeploySynthsLTC: StatefulEvent;
  afterDeploySynthProxyForSynthsLTC: StatefulEvent;
  afterDeployProxyERC20ForSynthsLTC: StatefulEvent;
  afterDeploySynthsLINK: StatefulEvent;
  afterDeploySynthProxyForSynthsLINK: StatefulEvent;
  afterDeployProxyERC20ForSynthsLINK: StatefulEvent;
  afterDeploySynthsEOS: StatefulEvent;
  afterDeploySynthProxyForSynthsEOS: StatefulEvent;
  afterDeployProxyERC20ForSynthsEOS: StatefulEvent;
  afterDeploySynthsBCH: StatefulEvent;
  afterDeploySynthProxyForSynthsBCH: StatefulEvent;
  afterDeployProxyERC20ForSynthsBCH: StatefulEvent;
  afterDeploySynthsETC: StatefulEvent;
  afterDeploySynthProxyForSynthsETC: StatefulEvent;
  afterDeployProxyERC20ForSynthsETC: StatefulEvent;
  afterDeploySynthsDASH: StatefulEvent;
  afterDeploySynthProxyForSynthsDASH: StatefulEvent;
  afterDeployProxyERC20ForSynthsDASH: StatefulEvent;
  afterDeploySynthsXMR: StatefulEvent;
  afterDeploySynthProxyForSynthsXMR: StatefulEvent;
  afterDeployProxyERC20ForSynthsXMR: StatefulEvent;
  afterDeploySynthsADA: StatefulEvent;
  afterDeploySynthProxyForSynthsADA: StatefulEvent;
  afterDeployProxyERC20ForSynthsADA: StatefulEvent;
  afterDeploySynthsCEX: StatefulEvent;
  afterDeploySynthProxyForSynthsCEX: StatefulEvent;
  afterDeployProxyERC20ForSynthsCEX: StatefulEvent;
  afterDeploySynthsDEFI: StatefulEvent;
  afterDeploySynthProxyForSynthsDEFI: StatefulEvent;
  afterDeployProxyERC20ForSynthsDEFI: StatefulEvent;
  afterDeploySynthiBTC: StatefulEvent;
  afterDeploySynthProxyForSynthiBTC: StatefulEvent;
  afterDeployProxyERC20ForSynthiBTC: StatefulEvent;
  afterDeploySynthiETH: StatefulEvent;
  afterDeploySynthProxyForSynthiETH: StatefulEvent;
  afterDeployProxyERC20ForSynthiETH: StatefulEvent;
  afterDeploySynthiBNB: StatefulEvent;
  afterDeploySynthProxyForSynthiBNB: StatefulEvent;
  afterDeployProxyERC20ForSynthiBNB: StatefulEvent;
  afterDeploySynthiTRX: StatefulEvent;
  afterDeploySynthProxyForSynthiTRX: StatefulEvent;
  afterDeployProxyERC20ForSynthiTRX: StatefulEvent;
  afterDeploySynthiXTZ: StatefulEvent;
  afterDeploySynthProxyForSynthiXTZ: StatefulEvent;
  afterDeployProxyERC20ForSynthiXTZ: StatefulEvent;
  afterDeploySynthiCEX: StatefulEvent;
  afterDeploySynthProxyForSynthiCEX: StatefulEvent;
  afterDeployProxyERC20ForSynthiCEX: StatefulEvent;
  afterDeploySynthiDEFI: StatefulEvent;
  afterDeploySynthProxyForSynthiDEFI: StatefulEvent;
  afterDeployProxyERC20ForSynthiDEFI: StatefulEvent;
  afterDeploySynthsFTSE: StatefulEvent;
  afterDeploySynthProxyForSynthsFTSE: StatefulEvent;
  afterDeployProxyERC20ForSynthsFTSE: StatefulEvent;
  afterDeploySynthsNIKKEI: StatefulEvent;
  afterDeploySynthProxyForSynthsNIKKEI: StatefulEvent;
  afterDeployProxyERC20ForSynthsNIKKEI: StatefulEvent;
  afterDeployExchangeRatesSynthiBTC: StatefulEvent;
  afterDeployExchangeRatesSynthiETH: StatefulEvent;
  afterDeployExchangeRatesSynthiBNB: StatefulEvent;
  afterDeployExchangeRatesSynthiTRX: StatefulEvent;
  afterDeployExchangeRatesSynthiXTZ: StatefulEvent;
  afterDeployExchangeRatesSynthiCEX: StatefulEvent;
  afterDeployExchangeRatesSynthiDEFI: StatefulEvent;
  afterAllContractsDeployed: StatefulEvent;
  rebuildCacheAfterDeployAllContracts: StatefulEvent;
  afterDeploySystemSetting: StatefulEvent;
  afterDeployIssuerForSynthSynthsUSD: StatefulEvent;
  afterDeployIssuerForSynthSynthsEUR: StatefulEvent;
  afterDeployIssuerForSynthSynthsJPY: StatefulEvent;
  afterDeployIssuerForSynthSynthsAUD: StatefulEvent;
  afterDeployIssuerForSynthSynthsGBP: StatefulEvent;
  afterDeployIssuerForSynthSynthsCHF: StatefulEvent;
  afterDeployIssuerForSynthSynthsXAU: StatefulEvent;
  afterDeployIssuerForSynthSynthsXAG: StatefulEvent;
  afterDeployIssuerForSynthSynthsBTC: StatefulEvent;
  afterDeployIssuerForSynthSynthsETH: StatefulEvent;
  afterDeployIssuerForSynthSynthsBNB: StatefulEvent;
  afterDeployIssuerForSynthSynthsTRX: StatefulEvent;
  afterDeployIssuerForSynthSynthsXTZ: StatefulEvent;
  afterDeployIssuerForSynthSynthsXRP: StatefulEvent;
  afterDeployIssuerForSynthSynthsLTC: StatefulEvent;
  afterDeployIssuerForSynthSynthsLINK: StatefulEvent;
  afterDeployIssuerForSynthSynthsEOS: StatefulEvent;
  afterDeployIssuerForSynthSynthsBCH: StatefulEvent;
  afterDeployIssuerForSynthSynthsETC: StatefulEvent;
  afterDeployIssuerForSynthSynthsDASH: StatefulEvent;
  afterDeployIssuerForSynthSynthsXMR: StatefulEvent;
  afterDeployIssuerForSynthSynthsADA: StatefulEvent;
  afterDeployIssuerForSynthSynthsCEX: StatefulEvent;
  afterDeployIssuerForSynthSynthsDEFI: StatefulEvent;
  afterDeployIssuerForSynthSynthiBTC: StatefulEvent;
  afterDeployIssuerForSynthSynthiETH: StatefulEvent;
  afterDeployIssuerForSynthSynthiBNB: StatefulEvent;
  afterDeployIssuerForSynthSynthiTRX: StatefulEvent;
  afterDeployIssuerForSynthSynthiXTZ: StatefulEvent;
  afterDeployIssuerForSynthSynthiCEX: StatefulEvent;
  afterDeployIssuerForSynthSynthiDEFI: StatefulEvent;
  afterDeployIssuerForSynthSynthsFTSE: StatefulEvent;
  afterDeployIssuerForSynthSynthsNIKKEI: StatefulEvent;
  afterDeployDebtCacheAndAllBindingsAndEvents: StatefulEvent;
  day: number;
  maxOraclePriceAge: number;
  expiryDuration: number;
  maxTimeToMaturity: number;
  creatorCapitalRequirement: string;
  creatorSkewLimit: string;
  poolFee: string;
  creatorFee: string;
  refundFee: string;
  oracleExRatesContractAddress: string;
  ETH_ADDRESS: string;
  useOvm: boolean;
  currentSynthetixSupply: object;
  currentWeekOfInflation: number;
  currentLastMintEvent: number;
  inflationStartDate: string;
  fixedPeriodicSupply: string;
  mintPeriod: number;
  mintBuffer: string;
  minterReward: string;
  supplyEnd: string;
  synths: object;
  feeds: object;
}
