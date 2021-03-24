# Module initialization

Here is the command that you would use in order to init hardhat-ignition
```
hardhat-ignition init \
  --privateKeys=<private_key>,<other_private_key> \
  --mnemonic="test test test test test test test test test test test junk" \
  --hdPath="m/44'/60'/0'/0"
```

This command would generate a hardhat-ignition config file that looks something like this:

```json
{
  "privateKeys": [
    "<private_key>",
    "<other_private_key>"
  ],
  "mnemonic": "test test test test test test test test test test test junk",
  "hdPath": "m/44'/60'/0'/0"
}
```
