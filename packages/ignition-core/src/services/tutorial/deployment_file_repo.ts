import fs from 'fs';
import path from 'path';

export class DeploymentFileRepo {
  private deploymentPath: string | undefined;
  private deploymentFile: string | undefined;

  constructor() {}

  setDeploymentPath(deploymentPath: string, deploymentFile: string): void {
    this.deploymentPath = deploymentPath;
    this.deploymentFile = deploymentFile;
  }

  storeNewDeployment(fileContent: string): void {
    if (!this.deploymentPath || !this.deploymentFile) {
      return;
    }

    if (!fs.existsSync(this.deploymentPath)) {
      fs.mkdirSync(this.deploymentPath);
    }
    fs.writeFileSync(
      path.resolve(this.deploymentPath, this.deploymentFile),
      fileContent,
      { encoding: 'utf8' }
    );
  }
}
