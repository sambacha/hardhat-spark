import { HardhatIgnitionConfig } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';
import { cli } from 'cli-ux';
import { ethers } from 'ethers';
import {
  PrivateKeyIsMissing,
  PrivateKeyNotValid,
  UserError
} from '../types/errors';
import { checkIfExist } from '../utils/util';
import { CONFIG_SCRIPT_NAME, IConfigService, NUMBER_OF_HD_ACCOUNTS } from './index';
import { loadScript } from '../utils/typescript-checker';

export default class ConfigService implements IConfigService {
  private readonly networkName: string;
  private config: HardhatIgnitionConfig;

  constructor(networkName?: string) {
    this.networkName = networkName;
  }

  async initializeIgnitionConfig(currentPath: string, configScriptPath: string, test: boolean = false): Promise<HardhatIgnitionConfig> {
    let configFilePath;
    if (configScriptPath) {
      configFilePath = path.resolve(currentPath, configScriptPath);
    } else {
      configFilePath = path.resolve(currentPath, CONFIG_SCRIPT_NAME);
    }

    let config: HardhatIgnitionConfig;
    if (configFilePath) {
      try {
        const configModules = await loadScript(configFilePath);

        if (Object.entries(configModules).length > 1) {
          throw new UserError('Sorry, but you can only have one config object!');
        }

        for (const [, ignitionConfig] of Object.entries(configModules)) {
          config = ignitionConfig as HardhatIgnitionConfig;
        }

        if (!checkIfExist(config?.networks)) {
          throw new UserError('network field is missing in config file.');
        }
      } catch (err) {
        if (err._isUserError) {
          throw err;
        }

        throw err;
      }
    }

    this.config = config;
    return config;
  }

  getAllWallets(rpcPath?: string): ethers.Wallet[] {
    const wallets = [];

    const config = this.config;
    if (!checkIfExist(this.networkName)) {
      return [];
    }

    let privateKeys = config?.privateKeys;
    let mnemonic = config?.mnemonic;
    let hdPath = config?.hdPath;
    if (
      checkIfExist(config?.networks) &&
      checkIfExist(config?.networks[this.networkName])
    ) {
      if (checkIfExist(config.networks[this.networkName]?.privateKeys)) {
        privateKeys = config.networks[this.networkName]?.privateKeys;
      }
      if (checkIfExist(config.networks[this.networkName]?.mnemonic)) {
        mnemonic = config.networks[this.networkName]?.mnemonic;
      }
      if (checkIfExist(config.networks[this.networkName]?.hdPath)) {
        hdPath = config.networks[this.networkName]?.hdPath;
      }
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcPath);

    for (const privateKey of privateKeys) {
      const wallet = new ethers.Wallet(privateKey, provider);

      wallets.push(wallet);
    }

    if (checkIfExist(hdPath) && checkIfExist(mnemonic)) {
      for (let i = 0; i < NUMBER_OF_HD_ACCOUNTS; i++) {
        const components = hdPath.split('/');
        components[components.length - 1] = String(i);
        hdPath = components.join('/');

        const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic, hdPath);

        wallets.push(new ethers.Wallet(hdNode.privateKey, provider));
      }
    }

    return wallets;
  }

  getFirstPrivateKey(): string {
    let privateKeys = [];
    if (checkIfExist(this.config?.privateKeys)) {
      privateKeys = this.config?.privateKeys;
    }
    if (
      checkIfExist(this.config.networks) &&
      checkIfExist(this.config.networks[this.networkName]) &&
      checkIfExist(this.config.networks[this.networkName]?.privateKeys)
    ) {
      privateKeys = this.config.networks[this.networkName]?.privateKeys;
    }
    if (privateKeys.length < 1) {
      throw new PrivateKeyIsMissing('Private keys are missing. Please provide them inside hardhat-ignition config file.');
    }
    try {
      new ethers.utils.SigningKey(privateKeys[0]);
    } catch (error) {
      cli.debug(error);
      throw new PrivateKeyNotValid(`You have provided string that is not private key. ${privateKeys[0]}`);
    }

    return privateKeys[0];
  }
}
