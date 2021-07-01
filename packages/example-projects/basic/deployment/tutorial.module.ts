import { buildModule, ModuleBuilder } from "ignition-core";

/*
Module is encapsulation for smart contract infrastructure, that includes smart contract deployment,
their interaction and event's execution.
*/
export const Test = buildModule("Test", async (m: ModuleBuilder) => {
  /*
  This is smart contract deployment definition.
  */
  const A = m.contract("A");
  const B = m.contract("B");
});
