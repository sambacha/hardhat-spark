# Hardhat ignition config

Let's create file `hardhat-ignition.config.ts`.

```typescript
import { HardhatIgnitionConfig } from '@tenderly/hardhat-ignition';

export const config: HardhatIgnitionConfig = {
  privateKeys: [
    "<private_key>"
  ],
  mnemonic: "test test test test test test test test test test test junk",
  hdPath: "m/44'/60'/0'/0"
};
```

All available options:

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
  params?: { [name: string]: any },
};
```
