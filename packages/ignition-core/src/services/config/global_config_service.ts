import { cli } from "cli-ux";
import fs from "fs";
import * as path from "path";

const IGNITION_GLOBAL_FILE_NAME = ".hardhat-ignition";

const { CI, HOME } = process.env;

export class GlobalConfigService {
  private readonly _homePath: string;

  constructor() {
    this._homePath = HOME as string;

    // check if file exist if it doesn't ask for consent and store it
    const globalConfigFilePath = path.resolve(
      this._homePath,
      IGNITION_GLOBAL_FILE_NAME
    );
    if (!fs.existsSync(globalConfigFilePath)) {
      return;
    }
  }

  public async mustConfirmConsent() {
    if (CI === "true") {
      return;
    }

    const globalFilePath = path.resolve(
      this._homePath,
      IGNITION_GLOBAL_FILE_NAME
    );
    if (fs.existsSync(globalFilePath)) {
      return;
    }
    const confirm = await cli.confirm(
      "We are gathering some error reporting data, do you want to opt in? (Y/n)"
    );

    fs.writeFileSync(globalFilePath, `IGNITION_ERROR_REPORTING=${confirm}`);

    return confirm;
  }

  public checkConsent(): boolean {
    if (CI === "true") {
      return false;
    }

    const globalConfigFilePath = path.resolve(
      this._homePath,
      IGNITION_GLOBAL_FILE_NAME
    );
    if (!fs.existsSync(globalConfigFilePath)) {
      return false;
    }

    fs.readFileSync(globalConfigFilePath);
    require("dotenv").config({ path: globalConfigFilePath });
    return process.env.IGNITION_ERROR_REPORTING === "true";
  }
}
