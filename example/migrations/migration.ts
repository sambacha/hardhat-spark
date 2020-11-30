import {
  ModuleBuilder,
  module,
  Binding,
  DeployedContractBinding, CompiledContractBinding, ContractBinding,
} from "../../src/interfaces/mortar"
import {BigNumber} from "ethers";

export const ExampleModule = module("ExampleModule", (m: ModuleBuilder) => {
  // Bind contracts for deployment.
  const Example = m.contract('Example', -1, "2", 3, "4", true, BigNumber.from(5), "0xdd2fd4581271e230360230f9337d5c0430bf44c0");
  const SecondExample = m.contract('SecondExample', Example, ["some", "random", "string"], [["hello"]], 123);
  const ThirdExample = m.contract('ThirdExample', SecondExample)

  Example.afterDeploy(async (AddressProvider: Binding, ...bindings: DeployedContractBinding[]) => {
    const [Example] = bindings

    const example = Example.instance()

    await example.setExample(100)
    const value = await example.getExample()

    console.log("Result: ", value)
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

  ThirdExample.onChange(async (AddressProvider: Binding, ...bindings: ContractBinding[]) => {
    const [Example] = bindings

    console.log(bindings)
    console.log("This is on change:", Example.name)
  }, Example)
})

export const SecondModule = module("SecondExample", (m: ModuleBuilder) => {
  const Example = m.contract('Example', -1, "2", 3, "4", true, BigNumber.from(5), "0xdd2fd4581271e230360230f9337d5c0430bf44c0");
  const SecondExample = m.contract('SecondExample', Example, ["some", "random", "string"], [["hello"]], 123);
  m.contract('ThirdExample', SecondExample)
})
