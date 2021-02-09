import {
  DeployReturn,
  module,
  ModuleBuilder,
} from '../../../src/interfaces/mortar';

export const FactoryModule = module('FactoryModule', async (m: ModuleBuilder) => {
  const factory = m.contract('Factory');
  const child = m.contract('Child');
  child.deployFn(async (): Promise<DeployReturn> => {
    const tx = await factory.instance().createChild(123);

    const children = await factory.instance().getChildren();

    return {
      transaction: tx,
      contractAddress: children[0]
    };
  }, factory);
});

export const FactoryModuleInterface = module('FactoryModule', async (m: ModuleBuilder) => {
  const factory = m.contract('Factory');
  factory.factoryCreate(m, 'Child', 'createChild', [123], {
    getterFunc: 'getChildren',
  });
});
