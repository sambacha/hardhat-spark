`ignition usage`
==============

Generate public usage module

* [`ignition usage [MODULE_FILE_PATH]`](#ignition-usage-module_file_path)

## `ignition usage [MODULE_FILE_PATH]`

Generate public usage module

```
USAGE
  $ ignition usage [MODULE_FILE_PATH]

OPTIONS
  -h, --help                           show CLI help
  --configScriptPath=configScriptPath  Path to the ignition.config.js script, default is same as current path.
  --debug                              Flag used for debugging
  --networkId=networkId                (required) Network ID of the network you are willing to deploy your contracts.

  --state=state                        Provide name of module's that you would want to use as state. Most commonly used
                                       if you are deploying more than one module that are dependant on each other.

  --testEnv                            This should be provided in case of test and/or CI/CD, it means that no state file
                                       will be store.
```

_See code: [src/commands/usage.ts](https://github.com/Tenderly/ignition/blob/main/src/commands/usage.ts)_
