# Module type-hints generation

Make sure that you already have your deployment file written. Next command will try .d.ts file from your deployment
script

First, run next command:

```
hardhat-ignition genTypes ./deployment/your.module.name.ts
```

You can now see that additional file is generated under `./deployments/YourModule` - `YourModule.d.ts`

The file should have class similar to one below.

```typescript
export declare class YourModuleBuilder extends ModuleBuilder {
  A: ContractBinding;
  B: ContractBinding;
  afterDeployBandC: StatefulEvent;
}
```

If you change from `m: ModuleBuilder` to `m: FirstModuleBuilder` inside your deployment script you will be able to use
typehint.
