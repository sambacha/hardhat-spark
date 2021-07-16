# Hardhat Ignition Tornado deployment tutorial

Actual tornado [readme](./READMEE.md).

## Installation

In the root directory of ignition run:

```
yarn install
yarn build
```

## Setup environment file

Create `.env` file and populate fields from `.env.example`.

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

Run `npx hardhat:ignition deploy` and choose `module.ts` in file picker.
