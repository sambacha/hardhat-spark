# Startup tutorial

Actual tornado [readme](./READMEE.md).

Steps need to be tackled in order to successfully run ignition deployment. This project is also part of
tutorial [here](../../docs/tutorial/basic.md)

## Installation and linking

Run next command in root of ignition:

```
npm link
```

Move to `example/tornado_cash` and run next command in order to install all dependencies and link to local
implementation of ignition.

```
npm i
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

## Validate artifacts

Check if all artifacts and builds are present, specifically
if `artifacts/contracts/MerkleTreeWithHistory.sol/Hasher.json` is present and if bytecode is empty. If it is, copy and
paste this file from gist: https://gist.github.com/filippetroviccc/eae4c2bcea9490a3352f374451b7d074

## Run ignition diff and deploy

Run next command and choose `module.ts` in file picker.

```
hardhat-ignition diff
```

Run next command and choose `module.ts` in file picker.

```
hardhat-ignition deploy
```
