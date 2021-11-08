import { ethers } from "ethers";
import { derivePrivateKeys } from "hardhat/internal/core/providers/util";
import {
  HardhatNetworkAccountConfig,
  HardhatNetworkAccountsUserConfig,
  HardhatNetworkHDAccountsConfig,
} from "hardhat/src/types/config";
import {
  EIP1193Provider,
  HttpNetworkAccountsUserConfig,
  HttpNetworkConfig,
} from "hardhat/types";
import { HardhatRuntimeEnvironment } from "hardhat/types/runtime";
import { IgnitionParams, IgnitionServices } from "ignition-core";

const createSigners = (
  accounts:
    | HttpNetworkAccountsUserConfig
    | HardhatNetworkAccountsUserConfig
    | undefined,
  provider: ethers.providers.JsonRpcProvider
): ethers.Signer[] => {
  const signers: ethers.Signer[] = [];
  if (accounts === undefined) {
    return [];
  }

  if (accounts === "remote") {
    return [];
  }

  const accountsAsMnemonic = accounts as HardhatNetworkHDAccountsConfig;
  if (accountsAsMnemonic?.mnemonic !== undefined) {
    const privateKeys = derivePrivateKeys(
      accountsAsMnemonic.mnemonic,
      accountsAsMnemonic.path,
      accountsAsMnemonic.initialIndex,
      accountsAsMnemonic.count
    );

    const wallets: ethers.Wallet[] = [];
    for (const item of privateKeys) {
      wallets.push(new ethers.Wallet(item, provider));
    }

    return wallets;
  }

  if (
    (accounts as HardhatNetworkAccountConfig[])[0]?.privateKey !== undefined
  ) {
    for (const account of accounts as HardhatNetworkAccountConfig[]) {
      signers.push(new ethers.Wallet(account.privateKey, provider));
    }
  }

  for (const account of accounts as string[]) {
    signers.push(new ethers.Wallet(account, provider));
  }

  return signers;
};

export const extractDataFromConfig = (
  networkName: string,
  networkId: string,
  environment: HardhatRuntimeEnvironment
): {
  params: IgnitionParams;
  customServices: IgnitionServices;
  moduleParams: { [name: string]: any };
} => {
  if (environment.config?.networks[networkName] === undefined) {
    return {
      params: {
        networkId,
        networkName,
        rpcProvider: new ethers.providers.Web3Provider(
          environment.network.provider as EIP1193Provider
        ),
      },
      customServices: {},
      moduleParams: {},
    };
  }

  const networkConfig = environment.config.networks[networkName];
  const networkUrl =
    (networkConfig as HttpNetworkConfig)?.url ?? "http://localhost:8545";

  let provider: ethers.providers.JsonRpcProvider;
  if (networkName === "hardhat") {
    provider = new ethers.providers.Web3Provider(
      environment.network.provider as EIP1193Provider
    );
  } else {
    provider = new ethers.providers.JsonRpcProvider(networkUrl, {
      name: networkName,
      chainId: +networkId,
    });
  }

  const ignition = environment.config?.ignition;

  const signers = createSigners(networkConfig?.accounts, provider);
  const params: IgnitionParams = {
    networkName,
    networkId,
    localDeployment: networkConfig?.localDeployment,
    rpcProvider: provider,
    signers,
    logging: ignition?.logging ?? true,
    test: ignition?.test ?? false,
    parallelizeDeployment: networkConfig?.parallelizeDeployment,
    blockConfirmation: networkConfig?.blockConfirmation,
    gasPriceBackoffMechanism: networkConfig?.gasPriceBackoff,
  };

  const customServices: IgnitionServices = {
    gasPriceProvider: ignition?.gasPriceProvider,
    nonceManager: ignition?.nonceManager,
    transactionSigner: ignition?.transactionSigner,
  };

  return {
    params,
    customServices,
    moduleParams: ignition?.moduleParams ?? {},
  };
};
