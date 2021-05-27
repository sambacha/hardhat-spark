import fs from "fs";
import fse from "fs-extra";
import * as path from "path";

const CONTRACTS_FOLDER = "contracts";
const DEPLOYMENT_FOLDER = "deployment";
const PACKAGE_DISTRIBUTION_FOLDER_NAME = "dist";

export class ModulePackagingService {
  private readonly _currentDir: string;
  private readonly _currentDistFolder: string;
  private readonly _packageName: string;
  private readonly _packageVersion: string;

  constructor(packageName: string, packageVersion: string) {
    this._currentDir = process.cwd();
    this._currentDistFolder = path.resolve(
      process.cwd(),
      PACKAGE_DISTRIBUTION_FOLDER_NAME
    );
    if (!fs.existsSync(this._currentDistFolder)) {
      fs.mkdirSync(this._currentDistFolder);
    }

    this._packageName = packageName;
    this._packageVersion = packageVersion;
  }

  public async initializePackageDistributionFolder() {
    const currentPackageFile = fs.readFileSync(
      path.resolve(this._currentDir, "package.json"),
      "utf-8"
    );
    const packageJson = JSON.parse(currentPackageFile);

    packageJson.name = this._packageName;
    packageJson.version = this._packageVersion;

    fs.writeFileSync(
      path.resolve(this._currentDistFolder, "package.json"),
      JSON.stringify(packageJson, undefined, 4)
    );
  }

  public async copyAllContracts() {
    fse.copySync(
      path.resolve(this._currentDir, CONTRACTS_FOLDER),
      path.resolve(this._currentDistFolder, CONTRACTS_FOLDER)
    );
  }

  public async copyAllDeploymentModules() {
    fse.copySync(
      path.resolve(this._currentDir, DEPLOYMENT_FOLDER),
      path.resolve(this._currentDistFolder, DEPLOYMENT_FOLDER)
    );
  }
}
