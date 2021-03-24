# Module Registry Resolver

Hardhat ignition provide ability to keep contract version with their currently deployed address. Most common reason for this
feature is ability to distribute your module to other people/projects for easier integration.

### Example Module

`<network_id>_<module_name>.json`

```json
{
  "v0.0.1": {
    "Example": "0x123..."
  }
}
```

### Second Example module

`<network_id>_<module_name>.json`

```json
{
  "v0.0.1": {
    "Example": "0x123...",
    "SecondExample": "0x124...",
    "ThirdExample": "0x125..."
  }
}
```

Here you can see that `Example` contract has the same address in both Module Registry json files, but second one has
more contracts.

In order to achieve this registry is not enough, we also need resolver that will fetch and resolve already deployed.

## Interface

```
export interface IModuleRegistryResolver {
  resolveContract(networkId: number, moduleName: string, bindingName: string): Promise<string>;
  setAddress(networkId: number, moduleName: string, bindingName: string, address: string): Promise<boolean>;
}
```

## Explanation

When this function is called (inside hardhat-ignition execution) it will set `address` to `bindingNmae` for `module_name`
and `network_id`.

```
  setAddress(networkId: number, moduleName: string, bindingName: string, address: string): Promise<boolean>;
```

On bootstrap, hardhat-ignition will try to fetch already deployed contract address using this function.

```
  resolveContract(networkId: number, moduleName: string, bindingName: string): Promise<string>;
```
