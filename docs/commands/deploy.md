`hardhat-hardhat-ignition deploy`
===============

Deploy new migrations, difference between current and already deployed.

* [`hardhat-igniton deploy [MODULE_FILE_PATH]`](#hardhat-ignition-deploy-module_file_path)

## `hardhat-ignition deploy [MODULE_FILE_PATH]`

Deploy new migrations, difference between current and already deployed.

```
USAGE
  $ hardhat-ignition deploy [MODULE_FILE_PATH]

OPTIONS
  -h, --help                             show CLI help
  --configScriptPath=configScriptPath    Path to the hardhat-ignition.config.js script, default is same as current path.
  --debug                                Used for debugging purposes.
  --networkId=networkId                  (required) Network ID of the network you are willing to deploy your contracts.

  --parallelize                          If this flag is provided hardhat-ignition will try to parallelize transactions, this mean
                                         that it will batch transaction and track dynamically their confirmation.

  --prompting=(json|streamlined|simple)  Prompting type: streamlined, overview or json. default: overview

  --rpcProvider=rpcProvider              RPC Provider - URL of open RPC interface for your ethereum node.

  --state=state                          Provide name of module's that you would want to use as state. Most commonly
                                         used if you are deploying more than one module that are dependant on each
                                         other.

  --testEnv                              This should be provided in case of test and/or CI/CD, it means that no state
                                         file will be store.

  --yes                                  Used to skip confirmation questions.
```

_See code: [src/commands/deploy.ts](https://github.com/nomiclabs/hardhat-ignition/blob/main/src/commands/deploy.ts)_
