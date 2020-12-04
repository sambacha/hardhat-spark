import {Config} from "../types/config"
import * as fs from 'fs';
import * as path from 'path';
import {cli} from "cli-ux";
import {ethers} from "ethers";
import {FailedToWriteToFile, PrivateKeyNotValid} from "../types/errors";

const CONFIG_FILENAME = 'mortar-config.json'

export default class ConfigService {
  private readonly configPath: string
  private config: Config

  constructor(dirPath: string) {
    this.configPath = path.resolve(dirPath, CONFIG_FILENAME)
    let content = ""
    try {
      content = fs.readFileSync(this.configPath, {
        encoding: 'UTF-8'
      })
      this.config = JSON.parse(content) as Config
    } catch(err) {
      this.config = {
        privateKey: ""
      }
    }
  }

  generateAndSaveConfig(privateKey: string): boolean {
    this.config = {
      privateKey: privateKey
    }

    try {
      new ethers.utils.SigningKey(privateKey)
    } catch (error) {
      cli.debug(error)

      throw new PrivateKeyNotValid("You have provided string that is not private key.")
    }

    try {
      fs.writeFileSync(this.configPath , JSON.stringify(this.config, null, 4))
    } catch (e) {
      throw new FailedToWriteToFile("Failed to write to file.")
    }

    return true
  }

  getPrivateKey(): string {
    const content = fs.readFileSync(this.configPath, {
      encoding: 'UTF-8'
    })

    const privateKey = (JSON.parse(content) as Config).privateKey
    try {
      new ethers.utils.SigningKey(privateKey)
    } catch (error) {
      cli.debug(error)
      cli.error("You have provided string that is not private key.")
      cli.exit(0)
    }

    return privateKey
  }
}
