import { Config, MortarConfig } from '../types/config';
import { cli } from 'cli-ux';
import { ethers } from 'ethers';
import { MnemonicNotValid, PrivateKeyNotValid } from '../types/errors';
import { checkIfExist } from '../utils/util';
import { IConfigService, NUMBER_OF_HD_ACCOUNTS } from './index';

export default class MemoryConfigService implements IConfigService {
  private config: Config;

  constructor(config?: Config) {
    if (checkIfExist(config)) {
      this.config = config;
    } else {
      this.config = {
        privateKeys: [],
        mnemonic: '',
        hdPath: '',
      };
    }
  }

  generateAndSaveConfig(privateKeys: string[], mnemonic?: string, hdPath?: string): boolean {
    for (const privateKey of privateKeys) {
      try {
        new ethers.utils.SigningKey(privateKey);
      } catch (error) {
        cli.debug(error);

        throw new PrivateKeyNotValid('You have provided string that is not private key.');
      }
    }

    try {
      ethers.Wallet.fromMnemonic(mnemonic, hdPath);
    } catch (error) {
      cli.debug(error);

      throw new MnemonicNotValid('You have provided string that is not private key.');
    }

    this.config = {
      privateKeys: privateKeys,
      mnemonic: mnemonic,
      hdPath: hdPath,
    };

    return true;
  }

  getAllWallets(rpcPath: string): ethers.Wallet[] {
    const wallets = [];

    const privateKeys = this.config.privateKeys;
    const mnemonic = this.config.mnemonic;
    let hdPath = this.config.hdPath;

    const provider = new ethers.providers.JsonRpcProvider(rpcPath);

    for (const privateKey of privateKeys) {
      const wallet = new ethers.Wallet(privateKey, provider);

      wallets.push(wallet);
    }

    if (
      checkIfExist(hdPath) &&
      checkIfExist(mnemonic) &&
      hdPath != '' &&
      mnemonic != ''
    ) {
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
    const privateKeys = this.config.privateKeys;
    try {
      new ethers.utils.SigningKey(privateKeys[0]);
    } catch (error) {
      cli.debug(error);
      throw new PrivateKeyNotValid(`You have provided string that is not private key. ${privateKeys[0]}`);
    }

    return privateKeys[0];
  }

  getMortarConfig(currentPath: string, configScriptPath: string): Promise<MortarConfig> {
    return Promise.resolve({});
  }

  saveEmptyMortarConfig(currentPath: string, configScriptPath: string): boolean {
    return true;
  }
}
