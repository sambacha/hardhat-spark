# Module

```typescript
  private initialized: boolean = false;
  private fn: ModuleBuilderFn;

  readonly name: string;
  private opts: ModuleOptions;
  private bindings: { [name: string]: ContractBinding };
  private events: Events;
  private moduleEvents: ModuleEvents;
  private actions: { [name: string]: Action };
  private moduleConfig: ModuleConfig | undefined;
  private prototypes: { [name: string]: Prototype };

  private registry: IModuleRegistryResolver | undefined;
  private resolver: IModuleRegistryResolver | undefined;
  private gasPriceProvider: IGasPriceCalculator | undefined;
  private nonceManager: INonceManager | undefined;
  private transactionSinger: ITransactionSigner | undefined;
```

## Module data
`initialized: boolean` - This variable is set to `true` if this module is root module for deployment. Their is ability to have multiple modules bundled together in a single one, and rest will have this field set to `false`

`fn: ModuleBuilderFn` - User defined module builder function

`name: string` - User defined module name

`opts: ModuleOptions` - This object is used to downstream some metadata to other modules that are binded with `setParam()` and `getParam()`

`bindings: { [name: string]: ContractBinding }` - Map of all contract bindings

`events: Events` - Map of all contract events

`moduleEvents: ModuleEvents` - Map of all module events

`actions: { [name: string]: Action }` - Map of all actions

`moduleConfig: ModuleConfig | undefined` - Module config object with contract bindings names and boolean flag that is signalizing if deploy should be occurring.

`prototypes: { [name: string]: Prototype }` - Map of all prototypes

## Module functionalities

`registry: IModuleRegistryResolver | undefined` - Custom, user defined, module execution registry. Used for storing contract addresses of deployed contracts.

`resolver: IModuleRegistryResolver | undefined` - Custom, user defined, module resolver. Used for resolving contract addresses of already deployed contracts.

`gasPriceProvider: IGasPriceCalculator | undefined` - Custom gas price provider for transactions

`private nonceManager: INonceManager | undefined` - Custom nonce manager

`private transactionSinger: ITransactionSigner | undefined` - Custom transaction singer 
