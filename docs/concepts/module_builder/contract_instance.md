# Deployed contract

If you want to call some contract function or read any contract property you will need to call `.deployed()` function
first in order to get `ethers.Contract` like object to interact with.

```typescript
export const FirstModule = buildModule('FirstModule', async (m: ModuleBuilder) => {
  const A = m.contract('A');

  A.afterDeploy(m, 'afterDeployA', async () => {
    const deployedContract = A.deployed();

    await deployedContract.setExample(1);
  });
});
```

## Custom signers

In case that you desire to change signer/deployer/sender of any function call that is triggered for contract A, here is 
how you can do that:

```
A.deployed().withSigner(newWallet)
```

```
withSigner(wallet: ethers.Wallet): ContractBinding
```
