import { ethers } from "ethers";
import { derivePrivateKeys } from "hardhat/internal/core/providers/util";
import {
  HardhatNetworkAccountConfig,
  HardhatNetworkAccountsUserConfig,
  HardhatNetworkHDAccountsConfig,
} from "hardhat/src/types/config";
import {
  HardhatUserConfig,
  HttpNetworkAccountsUserConfig,
  HttpNetworkConfig,
} from "hardhat/types";
import { IgnitionParams, IgnitionRepos, IgnitionServices } from "ignition-core";

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
  if (accountsAsMnemonic?.mnemonic === undefined) {
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
  config: HardhatUserConfig
): {
  params: IgnitionParams;
  customServices: IgnitionServices;
  repos: IgnitionRepos;
  moduleParams: { [name: string]: any };
} => {
  if (config?.networks === undefined) {
    return {
      params: {
        networkId,
        networkName,
      },
      customServices: {},
      repos: {},
      moduleParams: {},
    };
  }
  const networkConfig = config.networks[networkName];
  const ignition = config?.ignition;

  const networkUrl =
    (networkConfig as HttpNetworkConfig)?.url ?? "http://localhost:8545";

  const provider = new ethers.providers.JsonRpcProvider(networkUrl, {
    name: networkName,
    chainId: +networkId,
  });
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

  const repos: IgnitionRepos = {
    resolver: ignition?.resolver,
    registry: ignition?.registry,
  };

  return {
    params,
    customServices,
    repos,
    moduleParams: ignition?.moduleParams ?? {},
  };
};