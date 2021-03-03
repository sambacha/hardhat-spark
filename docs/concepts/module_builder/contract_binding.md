# Contract Bindings

Contract binding is way to specify contract deployment and his constructor arguments. In case if any of constructor
parameters are other contracts, then deployment would only occur when dependencies contract is deployed. You can look
under [here](../module_deps_resovler/module_deps_resolver.md) to better understand module dependency resolving.

```typescript
const contractBinding = m.contract('CONTRACT_NAME', 'FIRST', 'SECOND');
```

Below function is instantiating `ether.Contract` object, look [here](./contract_instance.md) for more detail.

```
instance(): ethers.Contract;
```

Changes from default contract deployer to the custom one.

```
setDeployer(wallet: ethers.Wallet): ContractBinding;
```

Specifies that contract binding is library contract.

```typescript
setLibrary();
```

### Contract Events

Specify module events. See [event lifecycle](./events.md) for more details.

```  
beforeDeployment(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent

afterDeployment(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent

beforeDeploy(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent

afterDeploy(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent

beforeCompile(m: ModuleBuilder, eventName: string, fn: EventFn, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent

afterCompile(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent

onChange(m: ModuleBuilder, eventName: string, fn: RedeployFn, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent
```

### Patterns

In case you want to change proxy implementation, this is the fastest way. It creates `afterDeploy` event hook in which
we are calling `setLogicFuncName()`.

```
proxySetNewLogic(m: ModuleBuilder, proxy: ContractBinding, logic: ContractBinding, setLogicFuncName: string, ...args: any): void;
```

If contract binding is factory you can automatically create new ContractBindings by calling this function.

```
factoryCreate(m: ModuleBuilder, childName: string, createFuncName: string, args: any[], opts?: FactoryCustomOpts): ContractBinding;
```

### Redeploy

Provide this flag in order to deploy ContractBinding and overwrite any state in stateFile for that contract.

```
force(): ContractBinding;
```

Set custom function that is return `true` if contract should be redeployed and `false` if not. Current state binding is
provided in order for a developer to determine if redeploy is needed.

```
export type ShouldRedeployFn = (curr: ContractBinding) => boolean;

shouldRedeploy(fn: ShouldRedeployFn): void
```

Specifies custom way of creating a contract binding. Most commonly used if smart-contract is created by calling other
contract function. You can look [here](../../../example/patterns/deployment/factory.module.ts) for example.

```
deployFn(deployFn: DeployFn, ...deps: ContractBinding[]): ContractBinding;
```

## Prototypes

With prototypes, you can define multiple contract bindings with same contract code.

```typescript
export const ProxyModule = buildModule('ProxyModule', async (m: ModuleBuilder) => {
  const ImplOne = m.bindPrototype('ImplOne', 'Proxy');
  const ImplTwo = m.bindPrototype('ImplTwo', 'Proxy');
});
```
