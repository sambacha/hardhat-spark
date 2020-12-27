export type ModuleRegistryResolver = {[version: string]: {[bindingName: string]: string}};
export const REGISTRY_NAME = 'module_registry.json';

export interface IModuleRegistryResolver {
  resolveContract(networkId: number, moduleName: string, bindingName: string): Promise<string>;
  setAddress(networkId: number, moduleName: string, bindingName: string, address: string): Promise<boolean>;
}
