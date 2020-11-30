import {ModuleBuilder, module} from "../../../../src/interfaces/mortar"

export const ExampleModule = module("ExampleModule",(m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.contract('Example');
  m.contract('SecondExample', Example);
})
