import { ModuleBuilder, module } from '../../../../src/interfaces/mortar';

export const ExampleModule = module('ExampleModule', async (m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.contract('Example');
  m.contract('SecondExample', Example);
});
