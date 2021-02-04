import { Config } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';
import { cli } from 'cli-ux';
import { ethers } from 'ethers';
import { FailedToWriteToFile, MnemonicNotValid, PrivateKeyNotValid } from '../types/errors';
import { checkIfExist } from '../utils/util';
import { CONFIG_FILENAME, IConfigService, NUMBER_OF_HD_ACCOUNTS } from './index';
import { Deferrable } from '@ethersproject/properties';
import { TransactionRequest, TransactionResponse } from '@ethersproject/abstract-provider';
import { MortarWallet } from '../../interfaces/mortar';
import { WalletTxExecutor } from '../ethereum/wallet/wrapper';

export default class ConfigService implements IConfigService {
  private readonly configPath: string;
  private config: Config;

  constructor(dirPath: string) {
    this.configPath = path.resolve(dirPath, CONFIG_FILENAME);
    let content = '';
    try {
      content = fs.readFileSync(this.configPath, {
        encoding: 'UTF-8'
      });
      this.config = JSON.parse(content) as Config;
    } catch (err) {
      this.config = {
        privateKeys: [],
        mnemonic: '',
        hdPath: '',
      };
    }
  }

  generateAndSaveConfig(privateKeys: string[], mnemonic: string, hdPath: string): boolean {
    this.config = {
      privateKeys: privateKeys,
      mnemonic: mnemonic,
      hdPath: hdPath,
    };

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

      throw new MnemonicNotValid('You have provided not valid mnemonic and/or hd path');
    }

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, undefined, 4));
    } catch (e) {
      throw new FailedToWriteToFile('Failed to write to file.');
    }

    return true;
  }

  getAllWallets(rpcPath: string): ethers.Wallet[] {
    // @TODO wrap wallets to store all transaction triggered from them to state file
    const wallets = [];

    const content = fs.readFileSync(this.configPath, {
      encoding: 'UTF-8'
    });
    const config = (JSON.parse(content) as Config);
    const privateKeys = config.privateKeys;
    const mnemonic = config.mnemonic;
    let hdPath = config.hdPath;

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
    const content = fs.readFileSync(this.configPath, {
      encoding: 'UTF-8'
    });

    const privateKeys = (JSON.parse(content) as Config).privateKeys;
    try {
      new ethers.utils.SigningKey(privateKeys[0]);
    } catch (error) {
      cli.debug(error);
      throw new PrivateKeyNotValid(`You have provided string that is not private key. ${privateKeys[0]}`);
    }

    return privateKeys[0];
  }
}
