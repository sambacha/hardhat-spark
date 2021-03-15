`ignition init`
=============

Initialize ignition configuration file and configuration script.

* [`ignition init`](#ignition-init)

## `ignition init`

Initialize ignition configuration file and configuration script.

```
USAGE
  $ ignition init

OPTIONS
  -h, --help                           show CLI help
  --configScriptPath=configScriptPath  Path to the ignition.config.js script, default is same as current path.
  --debug                              Flag used for debugging

  --hdPath=hdPath                      Associated with mnemonic - The HD parent of all the derived keys. Default value:
                                       "m/44'/60'/0'/0"

  --mnemonic=mnemonic                  Mnemonic of the deployer accounts

  --privateKeys=privateKeys            (required) Private Keys of the deployer accounts e.g. 0x123...,0x123...,0x123

  --reinit                             Provide this flag if you would like to overwrite `ignition.config.ts`, otherwise if
                                       exists, it would error.
```

_See code: [src/commands/init.ts](https://github.com/Tenderly/ignition/blob/main/src/commands/init.ts)_
