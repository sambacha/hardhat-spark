import {Config} from "../types/config"
import * as fs from 'fs';
import * as path from 'path';

export default class ConfigService {
  private config: Config

  constructor(networkId: string, privateKey: string) {
    this.config = {
      privateKey: privateKey,
    }
  }

  generateAndSaveConfig(dirPath: string): boolean {
    try {
      fs.writeFileSync(path.join(dirPath, 'mortar-config.json'), JSON.stringify(this.config))
    } catch (e) {
      throw new Error("failed to write to file")
    }

    return true
  }
}
