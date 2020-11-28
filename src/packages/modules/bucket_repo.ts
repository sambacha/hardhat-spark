import * as fs from "fs";
import * as path from "path";
import {
  Arguments,
  ContractBindingMetaData,
  DeployedContractBinding
} from "../../interfaces/mortar";
import {ModuleResolver} from "./module_resolver";
import {checkIfExist} from "../utils/util";

const BUCKET_DIR_NAME = '.mortar'
const BUCKET_NAME = 'deployed_module_builder_bucket.json'

export class ModuleBucketRepo {
  private readonly bucketPath: string
  private moduleResolver: ModuleResolver

  constructor(bucketPath: string) {
    const dir = path.resolve(bucketPath, BUCKET_DIR_NAME)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    this.bucketPath = dir
    this.moduleResolver = new ModuleResolver()
  }

  getBucketIfExist(): { [p: string]: DeployedContractBinding } | null {
    const dir = path.resolve(this.bucketPath, BUCKET_NAME)
    if (!fs.existsSync(dir)) {
      return null
    }

    return JSON.parse(fs.readFileSync(dir, {
      encoding: 'UTF-8'
    }))
  }

  storeNewBucket(bindings: { [p: string]: DeployedContractBinding } | null): void {
    if (bindings == null) {
      return
    }

    const metaData = ModuleBucketRepo.convertBindingsToMetaData(bindings)

    let dir = path.resolve(this.bucketPath, BUCKET_NAME)
    fs.writeFileSync(dir, JSON.stringify(metaData, null, 4))
    return
  }

  private static convertBindingsToMetaData(bindings: { [p: string]: DeployedContractBinding }): { [p: string]: ContractBindingMetaData } {
    const metaData: { [p: string]: ContractBindingMetaData } = {}

    for (let [bindingName, binding] of Object.entries(bindings)) {
      binding.args = this.convertArg(binding.args)
      metaData[bindingName] = new ContractBindingMetaData(binding.name, binding.args, binding.bytecode, binding.abi, binding.txData)
    }

    return metaData
  }

  private static convertArg(args: Arguments): Arguments {
    if (!checkIfExist(args)) {
      return args
    }

    for (let i = 0; i < args.length; i++) {
      const events = (args[i] as DeployedContractBinding).events
      if (!checkIfExist(events)){
        continue
      }

      if (events.afterDeploy.length > 0 || events.afterCompile.length > 0) { // @TODO make this more convenient to check
        args[i] = new ContractBindingMetaData(args[i].name, args[i].args, args[i].bytecode, args[i].abi, args[i].txData)
      }

      args[i].args = this.convertArg(args[i].args)
    }

    return args
  }
}
