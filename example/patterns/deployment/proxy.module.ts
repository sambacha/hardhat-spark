import { buildModule, ModuleBuilder } from '../../../src/interfaces/mortar';

export const ProxyModule = buildModule('ProxyModule', async (m: ModuleBuilder) => {
  m.contract('Registry');
  m.contract('LogicOne');
  m.Registry.shouldRedeploy(() => {
    return true;
  });

  m.group(m.LogicOne, m.Registry).afterDeploy(m, 'setLogicContractOnSecond', async () => {
    await m.Registry.instance().setLogicContract(m.LogicOne);
  });
});

export const ProxyModuleInterface = buildModule('ProxyModuleInterface', async (m: ModuleBuilder) => {
  const registry = m.contract('Registry');
  const logic = m.contract('LogicOne');

  registry.proxySetNewLogic(m, registry, logic, 'setLogicContract');
});
