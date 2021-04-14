# Module separation

There are multiple reason to separate a single module into multiple ones. First one is to have better code readability
and logic separation. And second one is if you plan to use some utility or external smart-contracts (e.g. oracles,
tokens, etc.).

## Internal sub modules

Here is example of the function that is used for sub-modules
```
  /**
   * Assigning sub-module. This function will share current share current module builder data (contracts and event) with
   * sub-module. On function execution it will return the context.
   *
   * @param m Module object
   * @param opts Optional module options
   * @param wallets Optional wallets that is going to be surfaced inside sub-module,
   *
   * @returns Module builder data from sub-module.
   */
  async useModule(m: Module | Promise<Module>, opts?: ModuleOptions, wallets?: ethers.Wallet[]): Promise<ModuleBuilder>
```

And this is how it is used inside deployment function:
```
await m.useModule(INTERNAL_MODULE);
```

### Context sharing

All internal sub-modules have same context as the root module. This means that if you want to use contract that is 
defined in any other module you will have ability to do that only if the definition happened before usage. Yuo can see below
example of this exact feature.

## External modules

External sub-modules are here for integration with protocols that are already deployed, and they are not part of the 
codebase of the root module. This is needed in order to separate deployment of current modules. Their is no difference
in defining internal or external module.

### Resolver

Resolver is specified inside `hardhat-ignition.config.ts` file. It is used to resolve deployed contract address with
specific contract version and contract name.

In order for class to be considered a resolver it needs to implement next interface `IModuleRegistryResolver`.
```typescript
export interface IModuleRegistryResolver {
  resolveContract(networkId: number, moduleName: string, bindingName: string): Promise<string>;
  setAddress(networkId: number, moduleName: string, bindingName: string, address: string): Promise<boolean>;
}
```

Here is example of one resolver:
```typescript
const registryAndResolver = new RemoteBucketStorage(
  'https://storage.googleapis.com',
  'europe-west3',
  'ignition_state_bucket',
  GOOGLE_ACCESS_KEY || '',
  GOOGLE_SECRET_ACCESS_KEY || '',
);
```
