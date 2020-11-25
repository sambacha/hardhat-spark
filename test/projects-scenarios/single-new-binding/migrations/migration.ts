import {ModuleBuilder, module} from "../../../../src/interfaces/mortar"

export const ExampleModule = module((m: ModuleBuilder) => {
  // Bind contracts for deployment.
  m.contract('Example');
})
