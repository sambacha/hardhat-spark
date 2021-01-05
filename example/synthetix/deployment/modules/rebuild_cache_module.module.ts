import { ContractBinding, ContractEvent, expectFuncRead, module } from '../../../../src/interfaces/mortar';
import { SynthetixCore, useOvm } from './core.module';
import { splitArrayIntoChunks, toBytes32 } from '../../util/util';
import { checkIfExist } from '../../../../src/packages/utils/util';
import { SynthetixAncillary } from './ancillary.module';
import { SynthetixSynths } from './synths.module';
import { BinaryOptionsModule } from './binary_options.module';
import { DappUtilities } from './dapp_utilities.module';
import { SynthetixInverseSynths } from './inverse_synthes.module';
import { SynthetixModuleBuilder } from '../../.mortar/SynthetixModule/SynthetixModule';

export const SynthetixRebuildCache = module('SynthetixRebuildCache', async (m: SynthetixModuleBuilder) => {
  await m.bindModule(SynthetixCore);
  await m.bindModule(SynthetixSynths);
  await m.bindModule(BinaryOptionsModule);
  await m.bindModule(DappUtilities);
  await m.bindModule(SynthetixAncillary);
  await m.bindModule(SynthetixInverseSynths);

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

    await AddressResolver.instance().importAddresses(contractBytes, contractAddresses);

    await expectFuncRead(undefined, AddressResolver.instance().areAddressesImported, contractBytes, contractAddresses);
  });

  const setTargetInResolverFromReadProxy = m.setTargetInResolverFromReadProxy.event as ContractEvent;
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
          // @ts-ignore
          contractAddress
        }
      }) => {
      return contractAddress;
    });

    if (useOvm) {
      const chunks = splitArrayIntoChunks(addressesToCache, 4);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await AddressResolver.instance().rebuildCaches([chunk], {
          gasLimit: 7e6
        });
      }
    } else {
      await AddressResolver.instance().rebuildCaches(addressesToCache, {
        gasLimit: 7e6
      });
    }

    for (let contractBinding of contractsWithRebuildableCache.dependencies) {
      contractBinding = contractBinding as ContractBinding;
      await contractBinding.instance().rebuildCache({
        gasLimit: 500e3,
      });

      await expectFuncRead(true, contractBinding.instance().isResolverCached, {
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
      await target.instance().setResolverAndSyncCache(ReadProxyAddressResolver, {
        gasLimit: 500e3,
      });

      await expectFuncRead(true, target.instance().isResolverCached, {
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
      await target.instance().setResolver(ReadProxyAddressResolver, {
        gasLimit: 500e3,
      });

      await expectFuncRead(ReadProxyAddressResolver, target.instance().resolver, {
        gasLimit: 500e3,
      });
    }
  });
});
