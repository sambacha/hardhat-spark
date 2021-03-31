## Config script

This is example of `hardhat-ignition.config.ts` file:
```typescript
export const config: HardhatIgnitionConfig = {
  privateKeys: [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
  ],
  mnemonic: 'test test test test test test test test test test test junk',
  hdPath: "m/44'/60'/0'/0",
  networks: {
    '31337': {
      rpc_provider: 'http://localhost:8545'
    }
  },
}
```

Here are all options that can be provided inside ignition config.
```typescript
export type HardhatIgnitionConfig = {
  privateKeys: string[];
  mnemonic?: string;
  hdPath?: string;
  networks?: {
    [network_id: string]: {
      rpc_provider?: string;
      privateKeys?: string[];
      mnemonic?: string;
      hdPath?: string;
    }
  }
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasPriceCalculator,
  nonceManager?: INonceManager,
  transactionSigner?: ITransactionSigner
  params?: {[name: string]: any},
};
```

`privateKeys` - Array of private keys that will be surfaced in module function.
`mnemonic` - Mnemonic example
`hdPath` - HD path that will be used to generate next 100 accounts.

All specified custom interfaces will be injected and used for every aspect of module execution. Same stands for params, you can take a look at [synthetix](../../example/synthetix/hardhat-ignition.config.ts) for detailed usage.



