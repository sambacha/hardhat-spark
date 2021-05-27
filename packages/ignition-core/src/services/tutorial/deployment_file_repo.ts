import fs from "fs";
import path from "path";

export class DeploymentFileRepo {
  private _deploymentPath: string | undefined;
  private _deploymentFile: string | undefined;

  constructor() {}

  public setDeploymentPath(
    deploymentPath: string,
    deploymentFile: string
  ): void {
    this._deploymentPath = deploymentPath;
    this._deploymentFile = deploymentFile;
  }

  public storeNewDeployment(fileContent: string): void {
    if (
      this._deploymentPath === undefined ||
      this._deploymentFile === undefined
    ) {
      return;
    }

    if (!fs.existsSync(this._deploymentPath)) {
      fs.mkdirSync(this._deploymentPath);
    }
    fs.writeFileSync(
      path.resolve(this._deploymentPath, this._deploymentFile),
      fileContent,
      { encoding: "utf8" }
    );
  }
}
