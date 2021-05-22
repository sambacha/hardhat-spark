export type ModuleRegistryResolver = {
  [version: string]: { [bindingName: string]: string };
};
export const REGISTRY_NAME = "module_registry.json";

export * from "./file_system";
export * from "./remote_bucket_storage";

export interface IModuleRegistryResolver {
  resolveContract(
    networkId: string,
    moduleName: string,
    bindingName: string
  ): Promise<string>;
  setAddress(
    networkId: string,
    moduleName: string,
    bindingName: string,
    address: string
  ): Promise<boolean>;
}
