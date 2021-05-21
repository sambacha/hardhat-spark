import * as path from 'path';
import fs from 'fs';
import { cli } from 'cli-ux';

const IGNITION_GLOBAL_FILE_NAME = '.hardhat-ignition';

const {
  CI,
  HOME
} = process.env;

export class GlobalConfigService {
  private readonly homePath: string;

  constructor() {
    this.homePath = HOME as string;

    // check if file exist if it doesn't ask for consent and store it
    const globalConfigFilePath = path.resolve(
      this.homePath,
      IGNITION_GLOBAL_FILE_NAME
    );
    if (!fs.existsSync(globalConfigFilePath)) {
      return;
    }
  }

  async mustConfirmConsent() {
    if (CI == 'true') {
      return;
    }

    const globalFilePath = path.resolve(
      this.homePath,
      IGNITION_GLOBAL_FILE_NAME
    );
    if (fs.existsSync(globalFilePath)) {
      return;
    }
    const confirm = await cli.confirm(
      'We are gathering some error reporting data, do you want to opt in? (Y/n)'
    );

    fs.writeFileSync(globalFilePath, `IGNITION_ERROR_REPORTING=${confirm}`);

    return confirm;
  }

  checkConsent(): boolean {
    if (CI == 'true') {
      return false;
    }

    const globalConfigFilePath = path.resolve(
      this.homePath,
      IGNITION_GLOBAL_FILE_NAME
    );
    if (!fs.existsSync(globalConfigFilePath)) {
      return false;
    }

    fs.readFileSync(globalConfigFilePath);
    require('dotenv').config({path: globalConfigFilePath});
    return process.env.IGNITION_ERROR_REPORTING == 'true';
  }
}
