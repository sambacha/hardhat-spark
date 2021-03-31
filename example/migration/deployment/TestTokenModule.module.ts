import { buildModule, ModuleBuilder } from '../../../src';

export const TestTokenModule = buildModule('TestTokenModule', async (m: ModuleBuilder) => {
  m.contractTemplate('Migrations');
  m.contractTemplate('TestToken');

  const Migrations = m.contract('Migrations');
  const TestToken = m.contract('TestToken');
});
