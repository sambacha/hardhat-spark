`hardhat-ignition diff`
=============

Difference between deployed and current migrations.

* [`hardhat-ignition diff [MODULE_FILE_PATH]`](#hardhat-ignition-diff-module_file_path)

## `hardhat-ignition diff [MODULE_FILE_PATH]`

Difference between deployed and current migrations.

```
USAGE
  $ hardhat-ignition diff [MODULE_FILE_PATH]

OPTIONS
  -h, --help                           show CLI help
  --configScriptPath=configScriptPath  Path to the hardhat-ignition.config.js script, default is same as current path.
  --debug                              Flag used for debugging
  --networkId=networkId                (required) Network ID of the network you are willing to deploy your contracts.

  --state=state                        Provide name of module's that you would want to use as states. Most commonly used
                                       if you are deploying more than one module that are dependant on each other.
```

_See code: [src/commands/diff.ts](https://github.com/nomiclabs/hardhat-ignition/blob/main/src/commands/diff.ts)_
