# Proxy

Proxy is one of the most common patterns when developing solidity smart-contracts.

## New logic

Here is example of `buildModule` function that is utilizing custom proxy functionality.

```typescript
export const ProxyModuleInterface = buildModule('ProxyModuleInterface', async (m: ModuleBuilder) => {
  const registry = m.contract('Registry');
  const logic = m.contract('LogicOne');

  registry.proxySetNewLogic(m, registry, logic, 'setLogicContract');
});
```

## Mutator

```typescript
const mutatorEvent = sendAfterDeploy(
  m,
  Proxy,
  'upgradeTo',
  [ERC20Two], {
    name: 'changeFromToSecondToken',
    slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' // bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
  }
);
```

Mutator is specially written macro(similar to macros in RustLang) like function. Her main use here is to change
implementation from `SomeContract` to `OtherContract`. You can see that we are specifying `Proxy` as `Contract`
and `upgradeTo` function name that would be called in order for upgrade to be executed. Next is array of `upgradeTo`
function arguments and lastly custom `opts` object that is housing custom name and slot. If `slot` is specified, instead
of smartly determining getter function (just removing `set` and putting `get`), it would
call `eth_getStorageAt(contractAddress, slot)` and compare returned data with contract address of `ERC20Two`.

To put it to simple words, it's upgrading proxy implementation and checking if upgrade actually happened.
