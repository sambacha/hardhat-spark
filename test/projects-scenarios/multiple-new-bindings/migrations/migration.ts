import {ModuleBuilder, module} from "../../../../src/interfaces/mortar"

export const ExampleModule = module((m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.contract('Example');
  m.contract('SecondExample', Example);
})
