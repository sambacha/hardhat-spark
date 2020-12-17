import {module, ModuleBuilder} from "../../../src/interfaces/mortar";
// @ts-ignore
import {ExampleModule} from "./migration";

export const ThirdExampleModule = module("ThirdExampleModule", async (m: ModuleBuilder) => {
  const module = await ExampleModule
  await m.bindModule(module)

  const secondExample = m.getBinding('SecondExample')
  m.contract('FourthExample', secondExample)
})
