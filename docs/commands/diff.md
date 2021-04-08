`hardhat-ignition diff`
=======================

Difference between deployed and current deployment.

* [`hardhat-ignition diff [MODULE_FILE_PATH]`](#hardhat-ignition-diff-module_file_path)

## `hardhat-ignition diff [MODULE_FILE_PATH]`

Difference between deployed and current deployment.

```
USAGE
  $ hardhat-ignition diff [MODULE_FILE_PATH]

OPTIONS
  -h, --help                           show CLI help
  --configScriptPath=configScriptPath  Path to the hardhat-ignition.config.js script, default is same as current path.
  --debug                              Flag used for debugging

  --network=network                    Network name is specified inside your config file and if their is none it will
                                       default to local(http://localhost:8545)

  --noPrompt                           If this flag is provided all prompts would default to 'Yes'.

  --state=state                        Provide name of module's that you would want to use as states. Most commonly used
                                       if you are deploying more than one module that are dependant on each other.
```
