import { ModuleBuilder, buildModule } from '../../../../src/interfaces/mortar';

export const ExampleModule = buildModule('ExampleModule', async (m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.contract('Example');
  m.contract('SecondExample', Example);
});
