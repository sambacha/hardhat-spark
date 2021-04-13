# Basic Tutorial

This will help you to understand a basic workflow and process of setting up simple deployment and what you can expect.

## Project setup

You will need to have hardhat and hardhat-ignition installed in our project.

```
npm i hardhat --save
npm i @tenderly/hardhat-ignition --save
```

Init hardhat and run hardhat node as a test environment.

```
npx hardhat
```

```
npx hardhat node
```

Also make sure you have `ts-node` and `typescript` installed.

```
npm i ts-node --save
npm i typescript --save
```

## Workflow

Let's say that we have this simple contract inside our project.

`A.sol`

```solidity
pragma solidity ^0.7.0;

contract A {
  uint256 example;

  constructor() {
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }

  function setExample(uint256 _example) public returns (bool) {
    example = _example;
    return true;
  }
}
```

### Ignition initialization

Firstly we would need to create our config script. 

Copy this into `hardhat-ignition.config.ts`.
```typescript
import { HardhatIgnitionConfig } from '@tenderly/hardhat-ignition';

export const config: HardhatIgnitionConfig = {
  privateKeys: [
    '<private_key>'
  ]
};
```
Here we just created a simple config if you want to see more configuration go [here](../concepts/config.md)

### Deployment module

Next thing is to set up your own deployment module. Let's create file under `./deployment/first.module.ts`.

```typescript
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';

export const FirstModule = buildModule('FirstModule', async (m: ModuleBuilder) => {
  const A = m.contract('A');
});
```

So here, we initialized our `FirstModule`. So we are using `buildModule()` from hardhat-ignition interface, and we named
it `FirstModule` alongside the function that has `m: ModuleBuilder`. `ModuleBuilder` is how you can specify what you
want to deploy/execute.

### Contract binding definition

```typescript
const A = m.contract('A');
```

This function is "binding" our solidity contract named `A` to our `ModuleBuilder` object, and it will return deployed of
ContractBinding.

### Event definition

Let's add `afterDeploy` event (you can check [here](../concepts/module_builder/events.md) about more events) to our
newly initialized `ContractBinding`.

```typescript
A.afterDeploy(m, 'afterDeployA', async () => {
})
```

### Contract function execution

Let's try now to execute some contract function.

```typescript
A.afterDeploy(m, 'afterDeployA', async () => {
  const txReceipt = await A.deployed().setExample();
})
```

You can see, that we need to run `deployed()` first in order to be able to call `setExample()`. When ethereum
transaction gets confirmed you will get `TransactionReceipt` object as return.

You should end up with something like this:

```typescript
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';

export const FirstModule = buildModule('FirstModule', async (m: ModuleBuilder) => {
  const A = m.contract('A');

  A.afterDeploy(m, 'afterDeployA', async () => {
    await A.deployed().setExample(11);
  });
});
```

### Module difference

Let's see what will be deployed if we stop here.

Run next command:

```
hardhat-ignition diff
```

This should be output in the console.

```
Module: FirstModule
+ Contract A
+ Event afterDeployBandC
```

### Module deployment #1

Now that we have defined a simple deployment module, lets run deploy command.

First check if you have your local node running.

```
npx hardhat node
```

Run `hardhat-ignition deploy` command.

```
hardhat-ignition deploy
```

After command is successfully run, you should see in your logs something like this

![log image](../images/basic_usage_log.png)

Also, you should check `./.hardhat-ignition/FirstModule/local_deployed_module_state.json` file to confirm execution and
check if everything is correctly deployed.

### Additional contract binding

Let's create additional contract: `B.sol`

```solidity
//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "./A.sol";

contract B {
  uint256 example;

  constructor(A a) {
  }
}
```

Add contract binding to `./deployment/first.module.ts` also.

```typescript
const B = m.contract('B', A);
```

Your `FirstModule` should look something like this.

```typescript
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';

export const FirstModule = buildModule('FirstModule', async (m: ModuleBuilder) => {
  const A = m.contract('A');
  const B = m.contract('B', A);

  A.afterDeploy(m, 'afterDeployA', async () => {
    await A.deployed().setExample(11);
  });
});
```

### Module - State file difference

Now lets see what is the difference between the already deployed module and new one.

Run next command:

```
hardhat-ignition diff ./deployment/first.module.ts --networkId=31337
```

Console output should be something like this.

```
Module: FirstModule
+ Contract B
  └── Contract: A
```

We don't see `ContractBinding(A)` and `afterDeployA` event because they are already deployed but `ContractBinding(B)` is
new, so we have `+` prefix.

### Change current binding

Let's change some part of the solidity code of `A.sol`, I'll just replace `hello` with `something` string in order to
change the bytecode. Symbol that is suggesting that we changed this contract, `~` should the prefix.

Now run command:

```
hardhat-ignition diff ./deployment/first.module.ts --networkId=31337
```

You should see this in your console logs:

```
Module: FirstModule
~ Contract:  A
~ Event afterDeployA
+ Contract B
  └── Contract: A
```

### Module deployment #2

We now want to execute our changes in `FirstModule` so let's run next command:

```
hardhat-ignition deploy ./deployment/first.module.ts
```

This should be execution logs:
![log image](../images/basic_usage_log_two.png)

### Module type hinting/generation

As a final step, lets generate typehints for your module for future development.

Run next command:

```
hardhat-ignition genTypes ./deployment/first.module.ts
```

You can now see that additional file is generated under `./deployments/FirstModule` - `FirstModule.d.ts`

It should have class that is similar to this one:

```typescript
export declare class FirstModuleBuilder extends ModuleBuilder {
  A: ContractBinding;
  B: ContractBinding;
  afterDeployBandC: StatefulEvent;
}
```

If you change from `m: ModuleBuilder` to `m: FirstModuleBuilder` you will be able to use typehint.

Your module function should look like this in order to have typehints:

```typescript
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';
import { FirstModuleBuilder } from './FirstModule';

export const FirstModule = buildModule('FirstModule', async (m: FirstModuleBuilder) => {
  const A = m.contract('A');
  const B = m.contract('B', A);

  A.afterDeploy(m, 'afterDeployA', async () => {
    await A.deployed().setExample(11);
  });
});
```

