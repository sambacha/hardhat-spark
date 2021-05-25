import { checkIfExist, expectFuncRead, ContractBinding, ContractEvent, buildModule } from 'ignition-core';
import { splitArrayIntoChunks, toBytes32 } from '../../util/util';

import { SynthetixModuleBuilder } from '../SynthetixModule';

export const SynthetixRebuildCache = buildModule('SynthetixRebuildCache', async (m: SynthetixModuleBuilder) => {
  const ReadProxyAddressResolver = m.ReadProxyAddressResolver;
  const AddressResolver = m.AddressResolver;
  const allContractDeployed = m.group(...Object.values(m.getAllBindings())).afterDeploy(m, 'afterAllContractsDeployed', async (): Promise<void> => {
    const contractAddresses: string[] = [];
    const contractBytes: string[] = [];

    const bindings = m.getAllBindings();
    Object.keys(bindings).map((key) => {
      if (checkIfExist(bindings[key].deployMetaData?.contractAddress)) {
        contractBytes.push(toBytes32(bindings[key].name));
        contractAddresses.push(bindings[key]?.deployMetaData?.contractAddress as string);
      }
    });

    await AddressResolver.deployed().importAddresses(contractBytes, contractAddresses);

    await expectFuncRead(undefined, AddressResolver.deployed().areAddressesImported, contractBytes, contractAddresses);
  });

  const setTargetInResolverFromReadProxy = m.mutatorsetTargetReadProxyAddressResolver.event as ContractEvent;
  m.group(
    ...Object.values(m.getAllBindings()),
    setTargetInResolverFromReadProxy,
    allContractDeployed
  ).afterDeploy(m, 'rebuildCacheAfterDeployAllContracts', async (): Promise<void> => {
    const bindings = m.getAllBindings();

    const contractsWithRebuildableCache = m.group(...Object.values(bindings))
      .find({
        functionName: 'rebuildCache'
      })
      .exclude('SynthetixBridgeToOptimism', 'SynthetixBridgeToBase');

    const addressesToCache = contractsWithRebuildableCache.map((
      {
        deployMetaData: {
          contractAddress
        }
      }) => {
      return contractAddress;
    });

    if (m.useOvm) {
      const chunks = splitArrayIntoChunks(addressesToCache, 4);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await AddressResolver.deployed().rebuildCaches([chunk], {
          gasLimit: 7e6
        });
      }
    } else {
      await AddressResolver.deployed().rebuildCaches(addressesToCache, {
        gasLimit: 7e6
      });
    }

    for (let contractBinding of contractsWithRebuildableCache.dependencies) {
      contractBinding = contractBinding as ContractBinding;
      await contractBinding.deployed().rebuildCache({
        gasLimit: 500e3,
      });

      await expectFuncRead(true, contractBinding.deployed().isResolverCached, {
        gasLimit: 500e3,
      });
    }

    // Now perform a sync of legacy contracts that have not been replaced in Shaula (v2.35.x)
    // EtherCollateral, EtherCollateralsUSD
    const contractsWithLegacyResolverCaching = m.group(...Object.values(bindings))
      .find({
        functionName: 'setResolverAndSyncCache'
      });

    for (let target of contractsWithLegacyResolverCaching.dependencies) {
      target = target as ContractBinding;
      await target.deployed().setResolverAndSyncCache(ReadProxyAddressResolver, {
        gasLimit: 500e3,
      });

      await expectFuncRead(true, target.deployed().isResolverCached, {
        gasLimit: 500e3,
      });
    }

    // Finally set resolver on contracts even older than legacy (Depot)
    const contractsWithLegacyResolverNoCache = m.group(...Object.values(bindings))
      .find({
        functionName: 'setResolver'
      });
    for (let target of contractsWithLegacyResolverNoCache.dependencies) {
      target = target as ContractBinding;
      await target.deployed().setResolver(ReadProxyAddressResolver, {
        gasLimit: 500e3,
      });

      await expectFuncRead(ReadProxyAddressResolver, target.deployed().resolver, {
        gasLimit: 500e3,
      });
    }
  });
});
