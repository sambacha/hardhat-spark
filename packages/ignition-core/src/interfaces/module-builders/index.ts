import { Module, ModuleBuilderFn, ModuleConfig } from "../hardhat-ignition";

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
