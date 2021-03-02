import { buildModule, ModuleBuilder } from '../../../src';

/*
Module is encapsulation for smart contract infrastructure, that includes smart contract deployment,
their interaction and event's execution.
*/
export const TestTokenModule = buildModule('TestTokenModule', async (m: ModuleBuilder) => {
  /*
  This is smart contract deployment definition.
  */
  const Migrations = m.contract('Migrations');
  const TestToken = m.contract('TestToken');
});
