# Hardhat Plugin

In order to use Ignition as hardhat plugin, as any other, you will need to import it inside your `hardhat.config.ts`
or `hardhat.config.js` file.

For Typescript:

```typescript
import '@tenderly/ignition/hardhat';
```

For javascript:

```javascript
require('@tenderly/ignition/hardhat');
```

## Ignition config inside hardhat config

After you imported ignition as a plugin inside hardhat we would need to set up config in order for Ignition to work
properly.

You will need to add this.
```typescript
ignition: {
  ignitionConfig: config,
  config: ignitionJsonConfig,
}
```

Where `ignitionConfig` filed is same object that is exported in `ignition.config.ts` file. And `config` is json object 
defined inside `ignition-config.json`.


### Type definition

```typescript
export type HardhatIgnitionConfig = {
  config: Config,
  ignitionConfig: IgnitionConfig
};
```

```typescript
export type Config = {
  privateKeys: string[];
  mnemonic?: string;
  hdPath?: string;
};

export type IgnitionConfig = {
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasPriceCalculator,
  nonceManager?: INonceManager,
  transactionSigner?: ITransactionSigner
  params?: { [name: string]: any },
};
```
