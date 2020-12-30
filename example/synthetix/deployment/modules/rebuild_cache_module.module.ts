import { ContractEvent, module, ModuleBuilder } from '../../../../src/interfaces/mortar';
import { JsonFragment } from '../../../../src/packages/types/artifacts/abi';
import { SynthetixCore, useOvm } from './core.module';
import { splitArrayIntoChunks, toBytes32 } from '../../util/util';
import { checkIfExist } from '../../../../src/packages/utils/util';
import { SynthetixAncillary } from './ancillary.module';
import { SynthetixSynths } from './synths.module';
import { BinaryOptionsModule } from './binary_options.module';
import { DappUtilities } from './dapp_utilities.module';
import { SynthetixInverseSynths } from './inverse_synthes.module';

export const SynthetixRebuildCache = module('SynthetixRebuildCache', async (m: ModuleBuilder) => {
  const core = await SynthetixCore;
  const synthsModule = await SynthetixSynths;
  const binaryOptionsModule = await BinaryOptionsModule;
  const dappUtilities = await DappUtilities;
  const synthetixAncillary = await SynthetixAncillary;
  const synthetixInverseSynths = await SynthetixInverseSynths;
  await m.bindModules(core, synthsModule, binaryOptionsModule, dappUtilities, synthetixAncillary, synthetixInverseSynths);

  const ReadProxyAddressResolver = m.getBinding('ReadProxyAddressResolver');
  const AddressResolver = m.getBinding('AddressResolver');
  const allContractDeployed = m.group(...Object.values(m.getAllBindings())).afterDeploy(m, 'afterAllContractsDeployed', async (): Promise<void> => {
    const contractAddresses: string[] = [];
    const contractBytes: string[] = [];

    const bindings = m.getAllBindings();
    Object.keys(bindings).map((key, index) => {
      if (checkIfExist(bindings[key].deployMetaData?.contractAddress)) {
        contractBytes.push(toBytes32(bindings[key].name));
        contractAddresses.push(bindings[key]?.deployMetaData?.contractAddress as string);
      }
    });

    await AddressResolver.instance().importAddresses(contractBytes, contractAddresses);

    const associatedContract = await AddressResolver.instance().areAddressesImported(contractBytes, contractAddresses);
    if (!associatedContract) {
      throw new Error('Address mismatch');
    }
  });

  const setTargetInResolverFromReadProxy = m.getEvent('setTargetInResolverFromReadProxy').event as ContractEvent;
  m.group(
    ...Object.values(m.getAllBindings()),
    setTargetInResolverFromReadProxy,
    allContractDeployed
  ).afterDeploy(m, 'rebuildCacheAfterDeployAllContracts', async (): Promise<void> => {
    const bindings = m.getAllBindings();

    const filterTargetsWith = ({functionName}: { functionName: string }) =>
      Object.entries(bindings).filter(([, target]) =>
        (target.abi as JsonFragment[]).find(({name}) => name === functionName)
      );

    const contractsWithRebuildableCache = filterTargetsWith({functionName: 'rebuildCache'})
      // And filter out the bridge contracts as they have resolver requirements that cannot be met in this deployment
      .filter(([contract]) => {
        return !/^(SynthetixBridgeToOptimism|SynthetixBridgeToBase)$/.test(contract);
      });

    const addressesToCache = contractsWithRebuildableCache.map(
      ([
         ,
         {
           name: name,
           deployMetaData: {
             // @ts-ignore
             contractAddress
           }
         }
       ]) => [name, contractAddress]
    );

    if (useOvm) {
      const chunks = splitArrayIntoChunks(addressesToCache, 4);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await AddressResolver.instance().rebuildCaches([chunk], {
          gasLimit: 7e6
        });
      }
    } else {
      // @TODO their is a revert here, tackle this problem later.
      for (const addressToCache of addressesToCache) {
        if (
          addressToCache[0] === 'SynthetixBridgeToOptimism' ||
          addressToCache[0] === 'SynthetixBridgeToBase'
        ) {
          continue;
        }

        await AddressResolver.instance().rebuildCaches([addressToCache[1]], {
          gasLimit: 7e6
        });
      }
    }

    for (const [, contractBinding] of contractsWithRebuildableCache) {
      if (
        contractBinding.name === 'SynthetixBridgeToOptimism' ||
        contractBinding.name === 'SynthetixBridgeToBase'
      ) {
        continue;
      }

      await contractBinding.instance().rebuildCache({
        gasLimit: 500e3,
      });

      const isResolverCached = await contractBinding.instance().isResolverCached({
        gasLimit: 500e3,
      });
      if (!isResolverCached) {
        throw new Error('Resolver cached is not set ');
      }
    }

    // Now perform a sync of legacy contracts that have not been replaced in Shaula (v2.35.x)
    // EtherCollateral, EtherCollateralsUSD
    const contractsWithLegacyResolverCaching = filterTargetsWith({
      functionName: 'setResolverAndSyncCache',
    });
    for (const [, target] of contractsWithLegacyResolverCaching) {
      await target.instance().setResolverAndSyncCache(ReadProxyAddressResolver, {
        gasLimit: 500e3,
      });

      const input = await target.instance().isResolverCached({
        gasLimit: 500e3,
      });
      if (!input) {
        throw new Error('Cache is not resolved');
      }
    }

    // Finally set resolver on contracts even older than legacy (Depot)
    const contractsWithLegacyResolverNoCache = filterTargetsWith({
      functionName: 'setResolver',
    });
    for (const [, target] of contractsWithLegacyResolverNoCache) {
      await target.instance().setResolver(ReadProxyAddressResolver, {
        gasLimit: 500e3,
      });

      const resolver = await target.instance().resolver({
        gasLimit: 500e3,
      });
      if (resolver != ReadProxyAddressResolver?.deployMetaData?.contractAddress) {
        throw new Error('Cache is not resolved');
      }
    }
  });
});
