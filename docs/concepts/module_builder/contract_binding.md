# Contract Bindings

```typescript
export const DaiModule = module('DaiModule', async (m: DaiModuleBuilder) => {
  const Dai = m.contract('Dai', 1);
});
```

## Prototypes

With prototypes, you can define multiple contract bindings with same contract code. 

```typescript
export const ProxyModule = module('ProxyModule', async (m: ModuleBuilder) => {
  const ImplOne = m.bindPrototype('ImplOne', 'Proxy');
  const ImplTwo = m.bindPrototype('ImplTwo', 'Proxy');
});
```
