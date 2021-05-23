import fs from "fs";
import fse from "fs-extra";
import * as path from "path";

const CONTRACTS_FOLDER = "contracts";
const DEPLOYMENT_FOLDER = "deployment";
const PACKAGE_DISTRIBUTION_FOLDER_NAME = "dist";

export class ModulePackagingService {
  private readonly currentDir: string;
  private readonly currentDistFolder: string;
  private readonly packageName: string;
  private readonly packageVersion: string;

  constructor(packageName: string, packageVersion: string) {
    this.currentDir = process.cwd();
    this.currentDistFolder = path.resolve(
      process.cwd(),
      PACKAGE_DISTRIBUTION_FOLDER_NAME
    );
    if (!fs.existsSync(this.currentDistFolder)) {
      fs.mkdirSync(this.currentDistFolder);
    }

    this.packageName = packageName;
    this.packageVersion = packageVersion;
  }

  public async initializePackageDistributionFolder() {
    const currentPackageFile = fs.readFileSync(
      path.resolve(this.currentDir, "package.json"),
      "utf-8"
    );
    const packageJson = JSON.parse(currentPackageFile);

    packageJson.name = this.packageName;
    packageJson.version = this.packageVersion;

    fs.writeFileSync(
      path.resolve(this.currentDistFolder, "package.json"),
      JSON.stringify(packageJson, undefined, 4)
    );
  }

  public async copyAllContracts() {
    fse.copySync(
      path.resolve(this.currentDir, CONTRACTS_FOLDER),
      path.resolve(this.currentDistFolder, CONTRACTS_FOLDER)
    );
  }

  public async copyAllDeploymentModules() {
    fse.copySync(
      path.resolve(this.currentDir, DEPLOYMENT_FOLDER),
      path.resolve(this.currentDistFolder, DEPLOYMENT_FOLDER)
    );
  }
}
