import { buildModule, ModuleBuilder } from '@tenderly/ignition';

export const TestTokenModule = buildModule('TestTokenModule', async (m: ModuleBuilder) => {
  m.prototype('Migrations');
  m.prototype('TestToken');

  const Migrations = m.contract('Migrations');
  const TestToken = m.contract('TestToken');
});
