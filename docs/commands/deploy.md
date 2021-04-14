`hardhat-ignition deploy`
=========================

Deploy new module, difference between current module and already deployed one.

* [`hardhat-ignition deploy [MODULE_FILE_PATH]`](#hardhat-ignition-deploy-module_file_path)

## `hardhat-ignition deploy [MODULE_FILE_PATH]`

Deploy new module, difference between current module and already deployed one.

```
USAGE
  $ hardhat-ignition deploy [MODULE_FILE_PATH]

OPTIONS
  -h, --help                           show CLI help
  --configScriptPath=configScriptPath  Path to the hardhat-ignition.config.js script, default is same as current path.
  --debug                              Used for debugging purposes.
  --logging=(json|streamlined|simple)  Logging type: streamlined, overview or json. default: overview

  --network=network                    Network name is specified inside your config file and if their is none it will
                                       default to local(http://localhost:8545)

  --parallelize                        If this flag is provided hardhat-ignition will try to parallelize transactions,
                                       this mean that it will batch transaction and track dynamically their
                                       confirmation.

  --rpcProvider=rpcProvider            RPC Provider - URL of open RPC interface for your ethereum node.

  --state=state                        Provide name of module's that you would want to use as state. Most commonly used
                                       if you are deploying more than one module that are dependant on each other.

  --testEnv                            This should be provided in case of test and/or CI/CD, it means that no state file
                                       will be store.
```
