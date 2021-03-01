import fs from 'fs';
import path from 'path';

export class DeploymentFileRepo {
  private deploymentPath: string;
  private deploymentFile: string;

  constructor() {
  }

  setDeploymentPath(deploymentPath: string, deploymentFile: string) {
    this.deploymentPath = deploymentPath;
    this.deploymentFile = deploymentFile;
  }

  storeNewDeployment(fileContent: string) {
    if (!fs.existsSync(this.deploymentPath)) {
      fs.mkdirSync(this.deploymentPath);
    }
    fs.writeFileSync(path.resolve(this.deploymentPath, this.deploymentFile), fileContent, {encoding: 'utf8'});
  }
}
