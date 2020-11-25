import {execSync} from "child_process";
import {assert} from "chai";

describe('mortar diff - integration', () => {
  it('should be able to show difference in modules - single new binding', ctx => {
    const output = execSync('cd test/projects-scenarios/single-new-binding && ../../../bin/run diff ./migrations/migration.ts')

    assert.equal(output.toString(), "+ Example\n")
    setImmediate(ctx)
  })
  it("should be able to show difference in modules - multiple new bindings", ctx => {
    const output = execSync('cd test/projects-scenarios/multiple-new-bindings && ../../../bin/run diff ./migrations/migration.ts')

    assert.equal(output.toString(), `+ Example
+ SecondExample
  └── Example
`)
    setImmediate(ctx)
  })
  it("should be able to show difference in modules - single modified binding", ctx => {
    const output = execSync('cd test/projects-scenarios/single-modified-binding && ../../../bin/run diff ./migrations/migration.ts')

    assert.equal(output.toString(), "~ Example\n")
    setImmediate(ctx)
  })
  it("should be able to show difference in modules - multiple modified binding", ctx => {
    const output = execSync('cd test/projects-scenarios/multiple-modified-binding && ../../../bin/run diff ./migrations/migration.ts')

    assert.equal(output.toString(), `~ Example
~ SecondExample
  └── Example
`)
    setImmediate(ctx)
  })

  it("should do nothing if their is no difference in module bindings", ctx => {
    const output = execSync('cd test/projects-scenarios/no-difference-in-binding && ../../../bin/run diff ./migrations/migration.ts')

    assert.equal(output.toString(), "Nothing changed from last revision\n")
    setImmediate(ctx)
  })
  it("should fail if their is less bindings in modules compared to deployed one", ctx => {
    const output = execSync('cd test/projects-scenarios/less-bindings && ../../../bin/run diff ./migrations/migration.ts')

    assert.equal(output.toString(), "Currently deployed module is bigger than current module.\n")
    setImmediate(ctx)
  })
})
