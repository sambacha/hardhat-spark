// @ts-ignore
// @TODO: fix this
import {getStateIfExist, storeNewState} from "../utils/files";
import {execSync} from "child_process";
import {assert} from "chai";

const networkId = 31337 // hardhat localhost chainId

describe('mortar deploy - integration', () => {
  it("should be able to deploy module - single new binding", ctx => {
    const projectFileName = 'single-new-binding'
    const output = runDeployCommand(projectFileName)

    assert.equal(output.includes("Deploy module -  ExampleModule"), true)
    assert.equal(output.includes("Example  - deploying"), true)
    setImmediate(ctx)
  })
  it("should be able to deploy module - multiple new bindings", ctx => {
    const projectFileName = 'multiple-new-bindings'
    const output = runDeployCommand(projectFileName)


    assert.equal(output.includes("Deploy module -  ExampleModule"), true)
    assert.equal(output.includes("Example  - deploying"), true)
    assert.equal(output.includes("SecondExample  - deploying"), true)
    setImmediate(ctx)
  })
  it("should be able to deploy module - single modified binding", ctx => {
    const projectFileName = 'single-modified-binding'
    const output = runDeployCommand(projectFileName)


    assert.equal(output.includes("Deploy module -  ExampleModule"), true)
    assert.equal(output.includes("Example  - deploying"), true)
    setImmediate(ctx)
  })
  it("should be able to deploy module - multiple modified binding", ctx => {
    const projectFileName = 'multiple-modified-binding'
    const output = runDeployCommand(projectFileName)

    assert.equal(output.includes("Deploy module -  ExampleModule"), true)
    assert.equal(output.includes("Example  - deploying"), true)
    assert.equal(output.includes("SecondExample  - deploying"), true)
    setImmediate(ctx)
  })

  it("should do nothing if their is no difference in modules", ctx => {
    const projectFileName = 'no-difference-in-binding'
    const output = runDeployCommand(projectFileName)

    assert.equal(output.includes("Nothing changed from last revision."), true)
    setImmediate(ctx)
  })
  it("should fail if their is less bindings in modules compared to deployed one", ctx => {
    const projectFileName = 'less-bindings'
    const output = runDeployCommand(projectFileName)

    assert.equal(output.includes("Currently deployed module is bigger than current module."), true)
    setImmediate(ctx)
  })
})

function runDeployCommand(projectFileName: string): string {
  const mortarDir = `./test/projects-scenarios/${projectFileName}/.mortar/ExampleModule/${networkId}_deployed_module_state.json`
  const currentState = getStateIfExist(mortarDir)

  const output = execSync(`../../../bin/run deploy ./migrations/migration.ts --networkId=${networkId} --skipConfirmation`, {
    cwd: `./test/projects-scenarios/${projectFileName}`,
    stdio: "pipe",
  })

  storeNewState(mortarDir, currentState)

  return output.toString()
}
