import {
  HardhatUserConfig,
  HttpNetworkAccountsUserConfig,
  HttpNetworkConfig
} from 'hardhat/types';
import { IgnitionParams, IgnitionRepos, IgnitionServices } from 'ignition-core';
import { ethers } from 'ethers';
import {
  HardhatNetworkAccountConfig,
  HardhatNetworkAccountsUserConfig,
  HardhatNetworkHDAccountsConfig,
} from 'hardhat/src/types/config';

const createSigners = (
  accounts: HttpNetworkAccountsUserConfig | HardhatNetworkAccountsUserConfig | undefined
): ethers.Signer[] => {
  const signers: ethers.Signer[] = [];
  if (!accounts) {
    return [];
  }

  if (accounts == 'remote') {
    return [];
  }

  if ((accounts as HardhatNetworkHDAccountsConfig)?.mnemonic) {
    // @TODO
    return [];
  }

  for (const account of (accounts as HardhatNetworkAccountConfig[])) {
    signers.push(
      new ethers.Wallet(account.privateKey)
    );
  }

  return signers;
};

export const extractDataFromConfig = (
  networkName: string,
  networkId: string,
  config: HardhatUserConfig
): {
  params: IgnitionParams,
  customServices: IgnitionServices,
  repos: IgnitionRepos,
  moduleParams: { [name: string]: any },
} => {
  if (
    !config ||
    !config.networks ||
    !config.ignition
  ) {
    return {
      params: {
        networkId,
        networkName
      },
      customServices: {},
      repos: {},
      moduleParams: {},
    };
  }
  const networkConfig = config.networks[networkName];
  const ignition = config.ignition;

  const networkUrl =
    (networkConfig as HttpNetworkConfig)?.url ||
    'http://localhost:8545';

  const signer = createSigners(networkConfig?.accounts);
  const params: IgnitionParams = {
    networkName,
    networkId,
    localDeployment: networkName == 'localhost',
    rpcProvider: new ethers.providers.JsonRpcProvider(networkUrl, networkId),
    signers: signer,

    logging: ignition?.logging,
    test: ignition?.test,
    parallelizeDeployment: ignition?.parallelizeDeployment,
    blockConfirmation: ignition?.blockConfirmation,
    gasPriceBackoffMechanism: ignition?.gasPriceBackoff,
  };

  const customServices: IgnitionServices = {
    gasPriceProvider: ignition?.gasPriceProvider,
    nonceManager: ignition?.nonceManager,
    transactionSigner: ignition?.transactionSigner,
  };

  const repos: IgnitionRepos = {
    resolver: ignition?.resolver,
    registry: ignition?.registry
  };

  return {
    params,
    customServices,
    repos,
    moduleParams: ignition?.moduleParams || {}
  };
};
