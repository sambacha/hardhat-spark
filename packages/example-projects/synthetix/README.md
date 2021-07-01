# Hardhat Ignition Synthetix deployment tutorial

## Installation and linking

In the root directory of ignition run:

```
npm link
```


Cd to `example/synthetix` and run `npm i` to install all dependencies and link to local binary of ignition.

## Setup Synthetix env
Paste the following into `.env`:
```
ETH_ADDRESS=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
PRIVATE_KEY=0x192c62b8796614830ff208c9bb7ba283e79193c706182cc70f395964976057d2
```

## Compilation

Compile the project before deploying:

```
npx hardhat compile
```

## Run Node

On a separate terminal, run:

```
npx hardhat node
```

## Run ignition deploy

Run `hardhat-ignition deploy` and choose `module.ts` in the file picker.
