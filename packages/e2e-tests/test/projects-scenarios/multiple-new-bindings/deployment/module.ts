import { ModuleBuilder, buildModule } from 'ignition-core';

export const ExampleModule = buildModule('ExampleModule', async (m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.contract('Example');
  m.contract('SecondExample', Example);
});
