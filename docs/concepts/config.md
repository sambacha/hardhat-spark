# Config script

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
    'local': {
      networkId: '31337',
      rpcProvider: 'http://localhost:8545',
    },
  },
}
```

Here are all options that can be provided inside ignition config, we will go thought every single one and describe what
it means.

```typescript
export type HardhatIgnitionConfig = {
  privateKeys: string[];
  mnemonic?: string;
  hdPath?: string;
  networks?: {
    [networkName: string]: {
      networkId?: string;
      rpcProvider?: string;
      privateKeys?: string[];
      mnemonic?: string;
      hdPath?: string;
      localDeployment?: boolean;
      deploymentFilePath?: string;
      blockConfirmation?: number;
      gasPriceBackoff?: GasPriceBackoff;
    }
  }
  registry?: IModuleRegistryResolver;
  resolver?: IModuleRegistryResolver;
  gasPriceProvider?: IGasPriceCalculator,
  nonceManager?: INonceManager,
  transactionSigner?: ITransactionSigner,
  params?: { [name: string]: any },
};

export type GasPriceBackoff = {
  maxGasPrice: ethers.BigNumber;
  backoffTime: number;
  numberOfRetries: number;
};
```

`privateKeys` - Array of private keys that will be surfaced in module function.

`mnemonic` - Mnemonic example

`hdPath` - HD path that will be used to generate next 100 accounts. So if you provided 10 private keys, then those
private keys would be surfaced first in array and rest of accounts. We would then have 110 accounts surfaced in module
builder function.

`networks` - Object that is housing all network with their specific configuration. It's a key-value map where key is a
developer provided network and value is configuration object.

`networks[networkName].networkId` - Network id, this is used only when transaction is being signed.

`networks[networkName].rpcProvider` - URL if node you are communication with (e.g. infura, tenderly forks etc.).

`networks[networkName].privateKeys` - Array of private keys that will be surfaced in module function, if provided it
would overwrite root private keys.

`networks[networkName].mnemonic` - Mnemonic string, if provided it would overwrite root field.

`networks[networkName].hdPath` - HD path that will be used to generate next 100 accounts, if provided it would overwrite
root hdPath.

`networks[networkName].hdPath` - HD path that will be used to generate next 100 accounts, if provided it would overwrite
root hdPath.

`networks[networkName].localDeployment` - This a simple flag that configures ignition how to tackle prompting for user.

`networks[networkName].deploymentFilePath` - Location of deployment file if not provided here you can specify it inside
CLI.

`networks[networkName].blockConfirmation` - Number of block's that needs to pass in order for ignition to continue to
next one.

`networks[networkName].gasPriceBackoff` - In case if transaction gas price is above `maxGasPrice` value transaction
execution would halt, and it would wait for `backoffTime` and check again. This process can repeat `numberOfRetries` times.

`params` - Custom module parameters

`registry` - Optional custom registry is used to store deployment addresses. You can write custom one or use our remote bucket.

`resolver` - Optional custom resolver is used to fetch deployment addresses of contracts. You can write custom one or use our remote bucket.

`gasPriceProvider` - Optional custom service for fetch gas price.

`nonceManager` -  Optional custom service for managing transaction nonce's.

`transactionSigner` - Optional custom class that is used for signing transaction.
