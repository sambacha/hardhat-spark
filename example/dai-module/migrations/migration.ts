import {Binding, DeployedContractBinding, module, ModuleBuilder} from "../../../src/interfaces/mortar";
// @ts-ignore
import {DaiModule} from "./dai_migration";

export const DaiExampleModule = module("DaiExampleModule", async (m: ModuleBuilder) => {
  const module = await DaiModule
  const resolver = module.getRegistry()
  if (resolver != null) {
    module.setResolver(resolver)
  }

  await m.bindModule(module)

  const Dai = m.getBinding('Dai')
  const Example = m.contract("Example", Dai)

  Example.afterDeployment(async (AddressProvider: Binding, ...bindings: DeployedContractBinding[]): Promise<DeployedContractBinding[]> => {
    const [Example] = bindings

    const example = Example.instance()

    const daiAddress = await example.getDai()

    console.log("THIS IS DAI ADDRESS: ", daiAddress)

    return bindings
  }, Example)
})
