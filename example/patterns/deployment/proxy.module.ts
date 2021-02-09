import { module, ModuleBuilder } from '../../../src/interfaces/mortar';

export const ProxyModule = module('ProxyModule', async (m: ModuleBuilder) => {
  m.contract('Registry');
  m.contract('LogicOne');
  m.Registry.shouldRedeploy(() => {
    return true;
  });

  m.group(m.LogicOne, m.Registry).afterDeploy(m, 'setLogicContractOnSecond', async () => {
    await m.Registry.instance().setLogicContract(m.LogicOne);
  });
});

export const ProxyModuleInterface = module('ProxyModuleInterface', async (m: ModuleBuilder) => {
  const registry = m.contract('Registry');
  const proxyRegistry = registry;
  const logic = m.contract('LogicOne');

  proxyRegistry.proxySetNewLogic(m, registry, logic, 'setLogicContract');
});
