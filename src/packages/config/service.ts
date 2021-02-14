import { Config, MortarConfig } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';
import { cli } from 'cli-ux';
import { ethers } from 'ethers';
import {
  FailedToWriteToFile,
  MnemonicNotValid,
  MortarConfigAlreadyExist,
  PrivateKeyNotValid,
  UserError
} from '../types/errors';
import { checkIfExist } from '../utils/util';
import { CONFIG_FILENAME, CONFIG_SCRIPT_NAME, IConfigService, NUMBER_OF_HD_ACCOUNTS } from './index';

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

  async getMortarConfig(currentPath: string, configScriptPath: string): Promise<MortarConfig> {
    let configFilePath;
    if (configScriptPath) {
      configFilePath = path.resolve(currentPath, configScriptPath);
    } else {
      configFilePath = path.resolve(currentPath, CONFIG_SCRIPT_NAME);
    }

    let config: MortarConfig;
    if (configFilePath) {
      let configModules;
      try {
        configModules = await require(configFilePath);
        if (Object.entries(configModules).length > 1) {
          throw new UserError('Sorry, but you can only have one config object!');
        }

        for (const [, mortarConfig] of Object.entries(configModules)) {
          config = mortarConfig as MortarConfig;
        }
      } catch (err) {
        if (err instanceof UserError) {
          throw err;
        }

        config = {};
      }
    }

    return config;
  }

  generateAndSaveConfig(privateKeys: string[], mnemonic?: string, hdPath?: string): boolean {
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
      if (mnemonic && hdPath) {
        throw new MnemonicNotValid('You have provided not valid mnemonic and/or hd path');
      }
    }

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, undefined, 4));
    } catch (e) {
      throw new FailedToWriteToFile('Failed to write to file.');
    }

    return true;
  }

  saveEmptyMortarConfig(currentPath: string, configScriptPath: string): boolean {
    const relativeMortarConfigPath = configScriptPath ? configScriptPath : CONFIG_SCRIPT_NAME;

    const mortarConfigPath = path.resolve(currentPath, relativeMortarConfigPath);
    if (fs.existsSync(mortarConfigPath)) {
      throw new MortarConfigAlreadyExist('You are trying to init empty mortar config but it already exist!');
    }

    // @TODO change to mortar package ref
    const mortarConfig = `import { MortarConfig } from '../../src/packages/types/config';

export const config: MortarConfig = {};
`;

    try {
      fs.writeFileSync(mortarConfigPath, mortarConfig);
    } catch (e) {
      throw new FailedToWriteToFile('Failed to write to file.');
    }

    return false;
  }

  getAllWallets(rpcPath?: string): ethers.Wallet[] {
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
