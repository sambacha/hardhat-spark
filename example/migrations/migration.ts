import {ModuleBuilder, module} from "mortar-tenderly/src/interfaces/mortar"

export const ExampleSetup = module((m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.bind('Example');
  const SecondExample = m.bind('SecondExample', Example);
  m.bind('ThirdExample', SecondExample);
})
