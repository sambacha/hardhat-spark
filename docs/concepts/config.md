## Config file

```json
{
    "privateKeys": [
        "0x123...",
        "0x124..."
    ],
    "mnemonic": "test test test test test test test test test test test junk",
    "hdPath": "m/44'/60'/0'/0"
}
```

`privateKeys` - Array of private keys that will be surfaced in module function.

`mnemonic` - Mnemonic example

`hdPath` - HD path that will be used to generate next 100 accounts.

## Config script

In a case that you want to specify any custom functionality for your deployment procedure, or you want to parametrize some variable this is place to do it.

```typescript
export type HardhatIgnitionConfig = {
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasPriceCalculator,
  nonceManager?: INonceManager,
  transactionSigner?: ITransactionSigner
  params?: {[name: string]: any},
};
```

All specified custom interfaces will be injected and used for every aspect of module execution. Same stands for params, you can take a look at [synthetix](../../example/synthetix/hardhat-ignition.config.ts) for detailed usage.



