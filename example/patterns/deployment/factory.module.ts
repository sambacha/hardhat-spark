import { FactoryContractBinding, module, ModuleBuilder, TransactionData } from '../../../src/interfaces/mortar';

export const FactoryModule = module('FactoryModule', async (m: ModuleBuilder) => {
  const factory = m.contract('Factory');
  const child = m.contract('Child');
  child.deployFn(async () => {
    const tx = await factory.instance().createChild(123);

    const children = await factory.instance().getChildren();

    return children[0];
  }, factory);
});

export const FactoryModuleInterface = module('FactoryModule', async (m: ModuleBuilder) => {
  const factory = m.contract('Factory').asFactory();
  const child = factory.create(m, 'Child', 'createChild', 123);
});
