import * as dotenv from "dotenv";
import { ethers, providers } from "ethers";
import { GasPriceCalculator } from "ignition-core";
import "ignition-hardhat-plugin";

import {
  ConstantGasPrice,
  GasPriceType,
} from "./deployment/custom_providers/constant_gas_price";
import { EthGasStationProvider } from "./deployment/custom_providers/eth_gas_station_provider";
import { TransactionManager } from "./deployment/custom_providers/transaction_manager";
dotenv.config({
  path: `${__dirname}/.env`,
});

const { ETH_GAS_STATION_API_KEY, INFURA_KEY, PRIVATE_KEY } = process.env;

const gasPriceProvider = new EthGasStationProvider(
  ETH_GAS_STATION_API_KEY as string,
  GasPriceType.average
);
const constantGasPriceProvider = new ConstantGasPrice();
const provider = new providers.JsonRpcProvider("http://localhost:8545");
const gasCalculator = new GasPriceCalculator(provider);
const wallet = new ethers.Wallet(PRIVATE_KEY as string);
const txManager = new TransactionManager(
  provider,
  wallet,
  process.env.IGNITION_NETWORK_ID as string,
  gasCalculator,
  gasPriceProvider
);

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    local: {
      chainId: 31337,
      url: "http://localhost:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      ],
      blockConfirmation: 1,
      localDeployment: true,
      deploymentFilePath: "./deployment/module.ts",
      parallelizeDeployment: false,
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      networkId: "42",
      rpcProvider: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      privateKeys: [PRIVATE_KEY as string],
      blockConfirmation: 2,
      localDeployment: true,
      parallelizeDeployment: false,
      deploymentFilePath: "./deployment/module.ts",
      gasPriceBackoff: {
        maxGasPrice: ethers.utils.parseUnits("20", "gwei"),
        backoffTime: 1000 * 15,
        numberOfRetries: 3,
      },
    },
  },
  ignition: {
    logging: true,
    test: false,
    gasPriceProvider: constantGasPriceProvider,
    nonceManager: txManager,
    transactionSigner: txManager,
    moduleParams: {},
  },
};
