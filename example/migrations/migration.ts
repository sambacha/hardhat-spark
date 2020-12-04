import {
  ModuleBuilder,
  module,
  Binding,
  DeployedContractBinding, CompiledContractBinding, ContractBinding,
} from "../../src/interfaces/mortar"
import {BigNumber} from "ethers";

export const ExampleModule = module("ExampleModule", async (m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.contract('Example', -1, "2", 3, "4", true, BigNumber.from(5), "0xdd2fd4581271e230360230f9337d5c0430bf44c0");
  const SecondExample = m.contract('SecondExample', Example, ["some", "random", "string"], [["hello"]], 123);
  const ThirdExample = m.contract('ThirdExample', SecondExample)

  m.registerAction("getName", (): any => {
    return "hello"
  })

  Example.afterDeployment(async (AddressProvider: Binding, ...bindings: DeployedContractBinding[]): Promise<DeployedContractBinding[]>  => {
    const [Example] = bindings

    const example = Example.instance()

    await example.setExample(100)
    let value = await example.getExample()

    await example.setExample(120)
    value = await example.getExample()

    m.registerAction("getName", (): any => {
      return value
    })

    return bindings
  }, Example)

  Example.afterDeployment(async (AddressProvider: Binding, ...bindings: DeployedContractBinding[]): Promise<DeployedContractBinding[]> => {
    const [Example] = bindings

    const example = Example.instance()

    await example.setExample(100)
    await example.setExample(130)

    return bindings
  }, Example)

  SecondExample.afterCompile(async (AddressProvider: Binding, ...bindings: CompiledContractBinding[]) => {
    const [SecondExample] = bindings

    console.log("This is after compile: ", SecondExample.bytecode)
  }, SecondExample)

  ThirdExample.beforeCompile(async (AddressProvider: Binding, ...bindings: ContractBinding[]) => {
    const [Example] = bindings

    console.log("This is before compile: ", Example.name)
  }, Example)

  ThirdExample.beforeDeployment(async (AddressProvider: Binding, ...bindings: ContractBinding[]) => {
    const [Example] = bindings

    console.log("This is before deployment: ", Example.name)
  }, Example)

  ThirdExample.onChange(async (AddressProvider: Binding, ...bindings: DeployedContractBinding[]): Promise<DeployedContractBinding[]> => {
    const [Example] = bindings

    console.log("This is on change:", Example.name)

    return bindings
  }, Example)
})

export const SecondModule = module("SecondExample", async (m: ModuleBuilder) => {
  const Example = m.contract('Example', -1, "2", 3, "4", true, BigNumber.from(5), "0xdd2fd4581271e230360230f9337d5c0430bf44c0");
  const SecondExample = m.contract('SecondExample', Example, ["some", "random", "string"], [["hello"]], 123);
  m.contract('ThirdExample', SecondExample)
})
