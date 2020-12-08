import {module, ModuleBuilder} from "../../src/interfaces/mortar";
// @ts-ignore
import {ExampleModule} from "./migration";

export const ThirdExampleModule = module("ThirdExampleModule", async (m: ModuleBuilder) => {
  const module = await ExampleModule
  const resolver = module.getRegistry()
  if (resolver != null) {
    module.setResolver(resolver)
  }

  await m.bindModule(module)

  const thirdExample = m.getBinding('ThirdExample')
  m.contract('FourthExample', thirdExample)
})
