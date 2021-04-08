`hardhat-ignition usage`
========================

Generate public usage module from standard module.

* [`hardhat-ignition usage [MODULE_FILE_PATH]`](#hardhat-ignition-usage-module_file_path)

## `hardhat-ignition usage [MODULE_FILE_PATH]`

Generate public usage module from standard module.

```
USAGE
  $ hardhat-ignition usage [MODULE_FILE_PATH]

OPTIONS
  -h, --help                           show CLI help
  --configScriptPath=configScriptPath  Path to the hardhat-ignition.config.js script, default is same as current path.
  --debug                              Flag used for debugging

  --network=network                    Network name is specified inside your config file and if their is none it will
                                       default to local(http://localhost:8545)

  --state=state                        Provide name of module's that you would want to use as state. Most commonly used
                                       if you are deploying more than one module that are dependant on each other.

  --testEnv                            This should be provided in case of test and/or CI/CD, it means that no state file
                                       will be store.
```
