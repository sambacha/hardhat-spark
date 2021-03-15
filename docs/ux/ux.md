# Deployment UX

## Expectancy

This is used to easily check contract function call return value. In case if `expectedValue` and return value of `readFunc` doesn't match it will throw error `UserError`.

```typescript
async function expectFuncRead(expectedValue: ContractBinding | any | undefined, readFunc: ContractFunction | any, ...readArgs: any): Promise<boolean>
```

```typescript
await expectFuncRead(
  ContractBinding(A), 
  B.instance().getAddressA
);
```

<hr>

In case if there is no contract function from which you can read the data there is an option to read directly from provided storage `slot`.

```typescript
async function expectSlotRead(expectedValue: ContractBinding | any | undefined, contract: ethers.Contract, slot: string | any): Promise<boolean>
```

```typescript
await expectSlotRead(
  ContractBinding(A), 
  B.instance(),
  '<slot_hash>'
);
```

<hr>

Same as `expectFuncRead` just it will not throw `UserError`, it will just return `false`.

```typescript
async function gracefulExpectFuncRead(expectedValue: ContractBinding | any, readFunc: ContractFunction, ...readArgs: any): Promise<boolean>
```

```typescript
gracefulExpectFuncRead(
  ContractBinding(A),
  B.instance().getAddressA
)
```

<hr>

Expects first value to be equal second one, and throw `UserError` if they are different or `true` if they are same.

```typescript
expect(firstValue: any, secondValue: any): boolean
```

Return true if `firstValue` is equal to `secondValue`, otherwise return `false`.

```typescript
gracefulExpect(firstValue: any, secondValue: any): boolean
```

## Macros

Mutator is the easies way to execute `set` function and immediately after call `get` function to check if desired value is set. If it doesn't it will throw `UserError`.

```typescript
const mutator = (
  m: ModuleBuilder, // ModuleBuilder provided in module function as parameter
  setter: ContractBinding, // ContractBinding of contract upon which setter function will be called
  setterFunc: string, // name of setter function
  setterArgs: any[], // setter args
  opts?: {
    name?: string, // ignition will dynamically generate name, you can overwrite it here
    getterFunc?: string, // ignition will replace "set" with "get", you can overwrite name of getter function here
    getterArgs?: any[], // ignition will remove last element in setterArgs array, and send that as getter args, you can overwrite that here
    expectedValue?: any, // ignition will expect last element of setterArgs to be equal to getterFunc return value
    deps?: (ContractBinding | Event)[] // define dependencies for setter/getter execution
    slot?: string, // option if their is no function for read and you need to use `getStorateAt`
  }
): ContractEvent
```

Filler is function with which you can easily fill ether to other wallets, use of this is mainly for local deployment scripts.

```typescript
const filler = (
  m: ModuleBuilder, // ModuleBuilder provided in module function as parameter
  rootWallet: ethers.Wallet, // wallet object that will send ethers
  wallets: ethers.Wallet[] // wallets that will receive ethers
): void
```
