import { HardhatCompiler } from "../../services/ethereum/compiler/hardhat";
import { ModuleValidator } from "../../services/modules/module_validator";
import { JsonFragment } from "../../services/types/artifacts/abi";
import { LinkReferences } from "../../services/types/artifacts/libraries";
import { MissingContractMetadata } from "../../services/types/errors";
import { checkIfExist } from "../../services/utils/util";
import {
  Module,
  ModuleBuilder,
  ModuleBuilderFn,
  ModuleConfig,
} from "../hardhat_ignition";

/**
 * This function is instantiating module class that will be used by hardhat-ignition in order to read user defined contracts and
 * events in order. This is not intended to be a valid deployment module, but rather to be used only as a sub-module
 * with resolver specified in hardhat-ignition.config.ts/js script.
 *
 * @param moduleName Name of the module
 * @param fn Function that will be used to build module.
 * @param moduleConfig Deployment module config, defines which bindings would be skipped.
 */
export async function buildUsage(
  moduleName: string,
  fn: ModuleBuilderFn,
  moduleConfig?: ModuleConfig | undefined
): Promise<Module> {
  return new Module(moduleName, fn, moduleConfig, true);
}

/**
 * This function is instantiating module class that will be used by hardhat-ignition in order to read user defined contracts and
 * events in order.
 *
 * @param moduleName Name of the module
 * @param fn Function that will be used to build module.
 * @param moduleConfig Deployment module config, defines which bindings would be skipped.
 */
export function buildModule(
  moduleName: string,
  fn: ModuleBuilderFn,
  moduleConfig?: ModuleConfig | undefined
): Module {
  return new Module(moduleName, fn, moduleConfig);
}

export async function handleModule(
  moduleBuilder: ModuleBuilder,
  moduleName: string,
  isUsage: boolean,
  isSubModule: boolean
): Promise<ModuleBuilder> {
  const compiler = new HardhatCompiler();
  const moduleValidator = new ModuleValidator();

  const contractBuildNames: string[] = [];
  const moduleBuilderBindings = moduleBuilder.getAllBindings();
  for (const [, bind] of Object.entries(moduleBuilderBindings)) {
    contractBuildNames.push(bind.contractName);
  }

  const bytecodes: { [name: string]: string } = compiler.extractBytecode(
    contractBuildNames
  );
  const abi: {
    [name: string]: JsonFragment[];
  } = compiler.extractContractInterface(contractBuildNames);
  const libraries: LinkReferences = compiler.extractContractLibraries(
    contractBuildNames
  );

  if (!isUsage) {
    moduleValidator.validate(moduleBuilderBindings, abi);
  }

  for (const [bindingName, binding] of Object.entries(moduleBuilderBindings)) {
    if (
      !checkIfExist(bytecodes[binding.contractName]) ||
      !checkIfExist(libraries[binding.contractName])
    ) {
      throw new MissingContractMetadata(
        `Contract metadata are missing for ${bindingName}`
      );
    }

    moduleBuilderBindings[bindingName].bytecode =
      bytecodes[binding.contractName];
    moduleBuilderBindings[bindingName].abi = abi[binding.contractName];
    moduleBuilderBindings[bindingName].libraries =
      libraries[binding.contractName];
  }

  return moduleBuilder;
}
