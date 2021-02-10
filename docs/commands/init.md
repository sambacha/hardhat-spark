## `mortar init`

Initialize mortar configuration file and configuration script.

```
USAGE
  $ mortar init

OPTIONS
  -h, --help                           show CLI help
  --configScriptPath=configScriptPath  Path to the mortar.config.js script, default is same as current path.
  --debug                              Flag used for debugging

  --hdPath=hdPath                      Associated with mnemonic - The HD parent of all the derived keys. Default value:
                                       "m/44'/60'/0'/0"

  --mnemonic=mnemonic                  Mnemonic of the deployer accounts

  --privateKeys=privateKeys            (required) Private Keys of the deployer accounts e.g. 0x123...,0x123...,0x123
```

_See code: [src/commands/init.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.0/src/commands/initweb.ts)_
