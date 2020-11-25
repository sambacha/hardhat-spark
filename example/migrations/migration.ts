import {ModuleBuilder, module} from "../../src/interfaces/mortar"

export const ExampleModule = module((m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.contract('Example');
  const SecondExample = m.contract('SecondExample', Example);
  m.contract('ThirdExample', SecondExample);
})
