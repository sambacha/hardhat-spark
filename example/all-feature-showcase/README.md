# Startup tutorial

Steps need to be tackled in order to successfully run ignition deployment.

## Installation and linking

Run next command in root of ignition:

```
npm link
```

Move to `example/all-feature-showcase` and run next command in order to install all dependencies and link to local
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

## Run ignition diff and deploy

Run next command and choose `module.ts` in file picker.
```
hardhat-ignition diff
```

Run next command and choose `module.ts` in file picker.
```
hardhat-ignition deploy
```
