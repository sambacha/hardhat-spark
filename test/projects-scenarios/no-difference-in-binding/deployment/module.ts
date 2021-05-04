import { ModuleBuilder, buildModule } from '../../../../src/interfaces/hardhat_ignition';

export const ExampleModule = buildModule('ExampleModule', async (m: ModuleBuilder) => {
  // Bind contracts for deployment.
  m.contract('Example');
});
