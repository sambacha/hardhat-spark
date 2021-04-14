# Usage module

In case if you are not comfortable with publicly displaying your smart contract deployment file but still there are
people that would like to use your smart contract infrastructure in their deployment script this would solve the
problem.

## Usage generation

Next command is resolving contract and events dependencies and generating "usage" module that only has useful contract
bindings without any private deployment data.

```
hardhat-ignition usage ./deployment/MODULE_NAME.module.ts --network=<NETWORK_NAME>
```

After running command you can check if that next file is generated: `module_name.usage.ts`.

## Usage of "usage-module" in other projects

Usage module is like any other module, just use `m.module` function to surface usage module data into your own module
project.
