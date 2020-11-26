import {CompiledContractBinding, DeployedContractBinding} from "../../src/interfaces/mortar";
import fs from "fs";

export function getBucketIfExist(dir: string): { [p: string]: DeployedContractBinding } | null {
  if (!fs.existsSync(dir)){
    return null
  }

  return JSON.parse(fs.readFileSync(dir, {
    encoding: 'UTF-8'
  }))
}

export function storeNewBucket(dir: string, bucket: { [p: string]: CompiledContractBinding } | null): void {
  if (bucket == null) {
    bucket = {}
  }

  fs.writeFileSync(dir, JSON.stringify(bucket,null, 4))
  return
}
