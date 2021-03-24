# Module fields

```typescript
class Module {
  [key: string]: ContractBinding | Event | Action | any;

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
  private transactionSigner: ITransactionSigner | undefined;
}
```

# Module data

Every single contract binding, library, Event and action are also stored in this simple map for easy access.

```
[key: string]: ContractBinding | Event | Action | any;
```

To retrieve ContractBinding using above structure.
```typescript
m.<binding_name>
```

<hr>

This variable is set to `true` if this module is root module for deployment. Their is ability
to have multiple modules bundled together in a single one, and rest will have this field set to `false`

```
initialized: boolean
```
<hr>

User defined module builder function
```
fn: ModuleBuilderFn
```

<hr>

User defined module name
```
name: string
``` 

<hr>

This object is used to downstream some metadata to other modules that are binded
with `setParam()` and `getParam()`
```
opts: ModuleOptions
```

<hr>

Map of all contract bindings

```
bindings: { [name: string]: ContractBinding }
```

<hr>

Map of all contract events

```
events: Events
```

<hr>

Map of all module events

```
moduleEvents: ModuleEvents
```

<hr>

Map of all actions
```
actions: { [name: string]: Action }
```

<hr>

Module config object with contract bindings names and boolean flag that is
signalizing if deploy should be occurring.

```
moduleConfig: ModuleConfig | undefined
```

<hr>

Map of all prototypes

```
prototypes: { [name: string]: Prototype }
```

# Module services/repos

<hr>

Custom, user defined, module execution registry. Used for storing
contract addresses of deployed contracts.

```
registry: IModuleRegistryResolver | undefined
```

<hr>

Custom, user defined, module resolver. Used for resolving contract
addresses of already deployed contracts.

```
resolver: IModuleRegistryResolver | undefined
```

<hr>

Custom gas price provider for transactions

```
gasPriceProvider: IGasPriceCalculator | undefined
```

<hr>

Custom nonce manager

```
nonceManager: INonceManager | undefined
```

<hr>

Custom transaction signer

```
transactionSigner: ITransactionSigner | undefined
```

# Full module interface

```typescript
class Module {
  contract(name: string, ...args: Arguments): ContractBinding;

  library(name: string, ...args: Arguments): ContractBinding;

  group(...dependencies: (ContractBinding | ContractEvent)[]): GroupedDependencies;

  prototype(name: string): Prototype;

  bindPrototype(name: string, prototypeName: string, ...args: Arguments): ContractBinding;

  param(name: string, value: any);

  getParam(name: string): any;

  setParam(opts: ModuleOptions);

  getEvent(eventName: string): StatefulEvent;

  getAllEvents(): Events;

  getAllModuleEvents(): ModuleEvents;

  registerAction(name: string, fn: ActionFn): Action;

  getAllActions(): { [name: string]: Action }

  buildModule(m: Module | Promise<Module>, opts?: ModuleOptions, wallets?: ethers.Wallet[]): Promise<void>;

  getBinding(name: string): ContractBinding;

  getAllBindings(): { [name: string]: ContractBinding };

  setResolver(resolver: IModuleRegistryResolver): void;

  getResolver(): IModuleRegistryResolver | undefined;

  setRegistry(registry: IModuleRegistryResolver): void;

  getRegistry(): IModuleRegistryResolver | undefined;

  setCustomGasPriceProvider(provider: IGasPriceCalculator): void;

  getCustomGasPriceProvider(): IGasPriceCalculator;

  setCustomNonceManager(nonceManager: INonceManager): void;

  getCustomNonceManager(): INonceManager;

  setCustomTransactionSigner(txSigner: ITransactionSigner): void;

  getCustomTransactionSigner(): ITransactionSigner;

  getAllPrototypes(): { [name: string]: Prototype };

  getAllOpts(): ModuleOptions;

  onStart(eventName: string, fn: ModuleEventFn): void;

  onCompletion(eventName: string, fn: ModuleEventFn): void;

  onSuccess(eventName: string, fn: ModuleEventFn): void;

  onFail(eventName: string, fn: ModuleEventFn): void
}
```

## Contract bindings

<hr>

Bind contract with `name` and his constructor arguments `args`. It will validate if contract with `name` is inside the projects and also if `args` are valid types (`number` is valid for any `uint` and `init`).

```typescript
  contract(name: string, ...args: Arguments): ContractBinding;
```

<hr>

This way you can tell hardhat-ignition that you are using libraries, and it will deploy them first, and if any other binding is using them inside thier bytecode it will dynamically inject them so you don't need to worry about that.

```typescript
library(name: string, ...args: Arguments): ContractBinding;
```

<hr>

Get single binding by name
```
getBinding(name: string): ContractBinding;
```

<hr>

Get all contact bindings that is stored in module.
```typescript
getAllBindings(): { [name: string]: ContractBinding };
```

## Grouping bindings and events

<hr>

You can assign event hooks on contract bindings but also you can specify group of contract bindings and events and assing event hooks on top of them. Also, you get some util functions to help you.

```typescript
  group(...dependencies: (ContractBinding | ContractEvent)[]): GroupedDependencies;
```

### Grouped Dependencies util functions

<hr>

Find all contracts that have specific function name.

```typescript
find(searchParams: SearchParams): GroupedDependencies;
```

<hr>

Exclude all contract bindings and events that matches with provided names.

```typescript
exclude(...elementName: string[]): GroupedDependencies;
```

<hr>

Run custom map function on bindings and events.

```typescript
map(fn: (value: ContractBinding, index: number, array: (ContractBinding | ContractEvent)[]) => any): (ContractBinding | ContractEvent)[];
```

## Prototypes

With prototypes, you can define multiple contract bindings with same contract code.

<hr>

Define single prototype with `name` as contract name.
```typescript
prototype(name: string): Prototype;
```

Similar to `contract()` function, just in this case `name` is actual name of the contract binding, `prototypeName` is name provided in `prototype()` function, most likely contract name, and `args` is constructor parameters.
```typescript
bindPrototype(name: string, prototypeName: string, ...args: Arguments): ContractBinding;
```

## Module parametrization

Set single module param with unique key `name` and stored value as `value`.
```typescript
param(name: string, value: any);
```

Fetch param with `name` as a unique key.
```typescript
getParam(name: string): any;
```

Rewrite all module options with custom ones.
```typescript
setParam(opts: ModuleOptions);
```

Get module options of desired module.
```typescript
getAllOpts(): ModuleOptions;
```

## Events

Fetch single event hook for `eventName` as a key.
```typescript
getEvent(eventName: string): StatefulEvent;
```

Get all contract event hooks that are assigned to the module.
```typescript
getAllEvents(): Events;
```

Get all module event hooks.
```
getAllModuleEvents(): ModuleEvents;
```

### Module Events

Specify module events. See [event lifecycle](./events.md) for more detailes.

```  
onStart(eventName: string, fn: ModuleEventFn): void;

onCompletion(eventName: string, fn: ModuleEventFn): void;

onSuccess(eventName: string, fn: ModuleEventFn): void;

onFail(eventName: string, fn: ModuleEventFn): void
```

## Actions

Actions are used to surface some dynamic event data (e.g. contract function response) to other event's.

See [action usage](actions.md)

```typescript
  registerAction(name: string, fn: ActionFn): Action;

  getAllActions(): { [name: string]: Action };
```

## Functionality 

Set custom module contract address resolver.

```typescript
  setResolver(resolver: IModuleRegistryResolver): void;
```

<hr>

Fetch current module address resolver.

```
  getResolver(): IModuleRegistryResolver | undefined;
```

<hr>

Set custom module contract address registry.

```
  setRegistry(registry: IModuleRegistryResolver): void;
```

<hr>

Get custom module contract address registry.

```
  getRegistry(): IModuleRegistryResolver | undefined;
```
