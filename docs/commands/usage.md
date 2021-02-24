`mortar usage`
==============

Generate public usage module

* [`mortar usage [MODULE_FILE_PATH]`](#mortar-usage-module_file_path)

## `mortar usage [MODULE_FILE_PATH]`

Generate public usage module

```
USAGE
  $ mortar usage [MODULE_FILE_PATH]

OPTIONS
  -h, --help                           show CLI help
  --configScriptPath=configScriptPath  Path to the mortar.config.js script, default is same as current path.
  --debug                              Flag used for debugging
  --networkId=networkId                (required) Network ID of the network you are willing to deploy your contracts.

  --state=state                        Provide name of module's that you would want to use as state. Most commonly used
                                       if you are deploying more than one module that are dependant on each other.

  --testEnv                            This should be provided in case of test and/or CI/CD, it means that no state file
                                       will be store.
```

_See code: [src/commands/usage.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.10/src/commands/usage.ts)_
