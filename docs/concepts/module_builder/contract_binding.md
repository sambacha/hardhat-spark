# Contract Bindings

```typescript
export const DaiModule = buildModule('DaiModule', async (m: DaiModuleBuilder) => {
  const Dai = m.contract('Dai', 1);
});
```

```
instance(): ethers.Contract;
```

```
setDeployer(wallet: ethers.Wallet): ContractBinding;
```

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

```
proxySetNewLogic(m: ModuleBuilder, proxy: ContractBinding, logic: ContractBinding, setLogicName: string, ...args: any): void;
```

```
factoryCreate(m: ModuleBuilder, childName: string, createFuncName: string, args: any[], opts?: FactoryCustomOpts): ContractBinding;
```

### Redeploy

```
force(): ContractBinding;
```

```
shouldRedeploy(fn: ShouldRedeployFn): void
```

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
