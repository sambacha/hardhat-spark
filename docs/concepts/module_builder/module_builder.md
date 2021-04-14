# Module Builder

Module builder is class interface for collection definition of [solidity contract bindings](./contract_binding.md)
and [event hooks](./events.md). It is used in order to define contract constructor arguments and run events in order to
set up desired smart contract infrastructure.

### Simple Module builder example image

![ModuleExample](../../images/module_example.png)

### Deployment script to achieve this with `buildModule()`

```typescript
export const RootModule = buildModule('RootModule', async (m: ModuleBuilder) => {
  const A = m.contract('A');
  const B = m.contract('B', A);
  const C = m.contract('C', A);

  m.group(B, C).afterDeploy(m, 'afterDeployBandC', async () => {
    await A.deployed().setExample(1);
  });
});
```

## Module specific concepts

| Module Concepts   | Glossary                                        | Link                                     |
| ----------------- | ----------------------------------------------- | ---------------------------------------- |
| Actions           | Dynamic data returning across multiple modules. | [actions](./actions.md)
| Contract Bindings | Contract deployment specification.              | [contract_bindings](./contract_binding.md)
| Deployed contract | Deployed contract in order to call contract function.    | [deployed_contract](./contract_instance.md)
| Events            | Contract event hooks.                           | [events](./events.md)
| Module Interface  | Module interface reference.                     | [module_interface](./module_interface.md)
