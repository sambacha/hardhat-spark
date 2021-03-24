# Factory

## Custom deploy function

This is function is here in order for you to specify how contract shall be deployed. You can see below, that we are
creating child contract from factory and returning meaningful data to hardhat-ignition, so it can be stored.

```typescript
export const FactoryModule = buildModule('FactoryModule', async (m: ModuleBuilder) => {
  const factory = m.contract('Factory');
  const child = m.contract('Child');
  child.deployFn(async (): Promise<DeployReturn> => {
    const tx = await factory.instance().createChild(123);

    const children = await factory.instance().getChildren();

    return {
      transaction: tx,
      contractAddress: children[0]
    };
  }, factory);
});
```

```typescript
  /**
 * Custom deploy function that
 *
 * @param deployFn
 * @param deps
 */
deployFn(deployFn:DeployFn, ...deps: ContractBinding[]):ContractBinding
```

## Create new child contract

This is example how you can create child contract from factory contract.

```typescript
export const FactoryModuleInterface = buildModule('FactoryModule', async (m: ModuleBuilder) => {
  const factory = m.contract('Factory');
  factory.factoryCreate(m, 'Child', 'createChild', [123], {
    getterFunc: 'getChildren',
  });
});
```

```typescript
  /**
 * Helper function for factory contracts to easily create new children contracts.
 *
 * @param m ModuleBuilder object.
 * @param childName Child contract name
 * @param createFuncName Contract creation func name in factory
 * @param args Contract creation arguments
 * @param opts Custom object that can overwrite smartly defined getterFunc and getterArgs.
 */
factoryCreate(m: ModuleBuilder, childName: string, createFuncName: string, args:any[], opts?: FactoryCustomOpts): ContractBinding
```
