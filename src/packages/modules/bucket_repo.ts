import * as fs from "fs";
import * as path from "path";
import {
  Arguments,
  ContractBindingMetaData,
  DeployedContractBinding
} from "../../interfaces/mortar";
import {ModuleResolver} from "./module_resolver";
import {checkIfEventsExist, checkIfExist} from "../utils/util";

const BUCKET_DIR_NAME = '.mortar'
const BUCKET_NAME = 'deployed_module_builder_bucket.json'

export class ModuleBucketRepo {
  private readonly bucketPath: string
  private moduleResolver: ModuleResolver

  constructor(bucketPath: string, moduleResolver: ModuleResolver) {
    const dir = path.resolve(bucketPath, BUCKET_DIR_NAME)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    this.bucketPath = dir
    this.moduleResolver = moduleResolver
  }

  getBucketIfExist(moduleName: string): { [p: string]: DeployedContractBinding } {
    const dir = path.resolve(this.bucketPath, moduleName, BUCKET_NAME)
    if (!fs.existsSync(dir)) {
      return {}
    }

    return JSON.parse(fs.readFileSync(dir, {
      encoding: 'UTF-8'
    })) || {}
  }

  storeNewBucket(moduleName: string, bindings: { [p: string]: DeployedContractBinding } | null): void {
    if (bindings == null) {
      return
    }

    const moduleDir = path.resolve(this.bucketPath, moduleName)
    const metaData = ModuleBucketRepo.convertBindingsToMetaData(bindings)
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir)
    }

    const bucketDir = path.resolve(moduleDir, BUCKET_NAME)
    fs.writeFileSync(bucketDir, JSON.stringify(metaData, null, 4))
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
      if (!checkIfExist(events)) {
        continue
      }

      if (checkIfEventsExist(events)) {
        args[i] = new ContractBindingMetaData(args[i].name, args[i].args, args[i].bytecode, args[i].abi, args[i].txData)
      }

      args[i].args = this.convertArg(args[i].args)
    }

    return args
  }
}
