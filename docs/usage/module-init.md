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

Look [here](../concepts/config.md) for more info.
