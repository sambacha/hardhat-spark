# Ignition hardhat tasks

## Tutorial

```
Usage: hardhat [GLOBAL OPTIONS] ignition:tutorial

ignition:tutorial: Easiest way to get started with hardhat-ignition, create couple contracts and start deploying.
```

## Diff

```
Usage: hardhat [GLOBAL OPTIONS] ignition:diff --config-script-path <STRING> --network-id <STRING> [--state <STRING>] moduleFilePath

OPTIONS:

  --config-script-path  Path to the hardhat-ignition.config.js script, default is same as current path. 
  --network-id          Network ID of the network you are willing to deploy your contracts. 
  --state               Provide name of module's that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other. (default: "")

POSITIONAL ARGUMENTS:

  moduleFilePath        Path to module deployment file. 

ignition:diff: Difference between deployed and current deployment.
```

## Deploy
```
Usage: hardhat [GLOBAL OPTIONS] ignition:deploy --network-id <STRING> [--parallelize] [--prompting <STRING>] --rpc-provider <STRING> [--state <STRING>] [--test-env] moduleFilePath

OPTIONS:

  --network-id          Network ID of the network you are willing to deploy your contracts. 
  --parallelize         If this flag is provided hardhat-ignition will try to parallelize transactions, this mean that it will batch transaction and track dynamically their confirmation. 
  --prompting           Prompting type: streamlined, overview or json. default: overview (default: "simple")
  --rpc-provider        RPC Provider - URL of open RPC interface for your ethereum node. 
  --state               Provide name of module's that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other. (default: "")
  --test-env            This should be provided in case of test and/or CI/CD, it means that no state file will be store. 

POSITIONAL ARGUMENTS:

  moduleFilePath        Path to module deployment file. 

ignition:deploy: Deploy new module, difference between current module and already deployed one.
```

## GenTypes

```
Usage: hardhat [GLOBAL OPTIONS] ignition:genTypes moduleFilePath configScriptPath

POSITIONAL ARGUMENTS:

  moduleFilePath        Path to module deployment file. 
  configScriptPath      Path to the hardhat-ignition.config.js script, default is same as current path. 

ignition:genTypes: It'll generate .d.ts file for written deployment modules for better type hinting.
```

## Usage

```
Usage: hardhat [GLOBAL OPTIONS] ignition:usage --config-script-path <STRING> --network-id <STRING> [--state <STRING>] [--test-env] moduleFilePath

OPTIONS:

  --config-script-path  Path to the hardhat-ignition.config.js script, default is same as current path. 
  --network-id          Network ID of the network you are willing to deploy your contracts. 
  --state               Provide name of module's that you would want to use as states. Most commonly used if you are deploying more than one module that are dependant on each other. (default: "")
  --test-env            This should be provided in case of test and/or CI/CD, it means that no state file will be store. 

POSITIONAL ARGUMENTS:

  moduleFilePath        Path to module deployment file. 

ignition:usage: Generate public usage module from standard module.
```

## Migration

```
Usage: hardhat [GLOBAL OPTIONS] ignition:migration [--from <STRING>] --module-name <STRING>

OPTIONS:

  --from        Deployment package name (truffle, hardhatDeploy) (default: "truffle")
  --module-name Module name for which you would like to migrate state file to. 

ignition:migration: Migrate deployment meta data from other deployers to hardhat-ignition state file.
```
