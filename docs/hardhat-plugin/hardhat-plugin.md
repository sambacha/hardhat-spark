# Hardhat Plugin

In order to use hardhat-ignition as hardhat plugin, as any other, you will need to import it inside
your `hardhat.config.ts`
or `hardhat.config.js` file.

For Typescript:

```typescript
import '@tenderly/hardhat-ignition/hardhat';
```

For javascript:

```javascript
require('@tenderly/hardhat-ignition/hardhat');
```

## Hardhat ignition config inside hardhat config

After you imported hardhat-ignition as a plugin inside hardhat we would need to set up config in order for Ignition to
work properly.

You will need to add this.

```typescript
hardhatIgnition: HardhatPluginIgnitionConfig
```

Where `hardhatIgnitionConfig` filed is same object that is exported in `hardhat-ignition.config.ts` file. And `config`
is json object defined inside `hardhat-ignition_config.json`.

### Type definition

```
export type HardhatPluginIgnitionConfig = {
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
