import {
  DeployReturn,
  buildModule,
  ModuleBuilder,
} from '../../../src';

export const FactoryModule = buildModule('FactoryModule', async (m: ModuleBuilder) => {
  const factory = m.contract('Factory');
  const child = m.contract('Child');
  child.deployFn(async (): Promise<DeployReturn> => {
    const tx = await factory.deployed().createChild(123);

    const children = await factory.deployed().getChildren();

    return {
      transaction: tx,
      contractAddress: children[0]
    };
  }, factory);
});

export const FactoryModuleInterface = buildModule('FactoryModule', async (m: ModuleBuilder) => {
  const factory = m.contract('Factory');
  factory.factoryCreate(m, 'Child', 'createChild', [123], {
    getterFunc: 'getChildren',
  });
});
