import { ModuleBuilder, buildModule } from '../../../../src/interfaces/ignition';

export const ExampleModule = buildModule('ExampleModule', async (m: ModuleBuilder) => {
  // Bind contracts for deployment.
  m.contract('Example');
  // m.contract('SecondExample');
});
