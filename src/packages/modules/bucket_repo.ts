import * as fs from "fs";
import * as path from "path";
import {CompiledContractBinding, DeployedContractBinding} from "../../interfaces/mortar";
import {ModuleResolver} from "./module_resolver";

const BUCKET_DIR_NAME = '.mortar'
const BUCKET_NAME = 'deployed_module_builder_bucket.json'

export class ModuleBucketRepo {
  private readonly bucketPath: string
  private moduleResolver: ModuleResolver

  constructor(bucketPath: string) {
    const dir = path.resolve(bucketPath, BUCKET_DIR_NAME)

    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }

    this.bucketPath = dir
    this.moduleResolver = new ModuleResolver()
  }

  getBucketIfExist(): { [p: string]: DeployedContractBinding } | null {
    const dir = path.resolve(this.bucketPath, BUCKET_NAME)
    if (!fs.existsSync(dir)){
      return null
    }

    return JSON.parse(fs.readFileSync(dir, {
      encoding: 'UTF-8'
    }))
  }

  storeNewBucket(bucket: { [p: string]: CompiledContractBinding } | null): void {
    if (bucket == null) {
      return
    }

    let dir = path.resolve(this.bucketPath, BUCKET_NAME)
    fs.writeFileSync(dir, JSON.stringify(bucket,null, 4))
    return
  }
}
