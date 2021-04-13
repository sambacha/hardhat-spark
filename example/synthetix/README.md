# Startup tutorial

Steps need to be tackled in order to successfully run ignition deployment. This project is also part of
tutorial [here](../../docs/tutorial/basic.md)

## Installation and linking

Run next command in root of ignition:

```
npm link
```

Move to `example/synthetix` and run next command in order to install all dependencies and link to local
implementation of ignition.

```
npm i
```

## Setup env

Here are some defaults:
```
ETH_ADDRESS=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
PRIVATE_KEY=0x192c62b8796614830ff208c9bb7ba283e79193c706182cc70f395964976057d2
```

## Compilation

Run next command:

```
npx hardhat compile
```

## Run Node

Run next command:

```
npx hardhat node
```

## Run ignition diff and deploy

Run next command and choose `module.ts` in file picker.

```
hardhat-ignition diff
```

Run next command and choose `module.ts` in file picker.

```
hardhat-ignition deploy
```
