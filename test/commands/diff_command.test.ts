import { execSync } from 'child_process';
import { assert } from 'chai';

const NETWORK_NAME = 'local';

describe('ignition diff - integration', () => {
  it('should be able to show difference in modules - single new binding', ctx => {
    const output = execSync(`../../../bin/run diff ./deployment/module.ts --network=${NETWORK_NAME} --noPrompt`, {
      cwd: './test/projects-scenarios/single-new-binding'
    });

    assert.equal(output.toString(), '\nModule: ExampleModule\n' +
      '+ Contract Example\n');
    setImmediate(ctx);
  });

  it('should be able to show difference in modules - multiple new bindings', ctx => {
    const output = execSync(` ../../../bin/run diff ./deployment/module.ts --network=${NETWORK_NAME} --noPrompt`, {
      cwd: './test/projects-scenarios/multiple-new-bindings'
    });

    assert.equal(output.toString(), `
Module: ExampleModule
+ Contract Example
+ Contract SecondExample
  └── Contract: Example
`);
    setImmediate(ctx);
  });

  it('should be able to show difference in modules - single modified binding', ctx => {
    const output = execSync(`../../../bin/run diff ./deployment/module.ts --network=${NETWORK_NAME} --noPrompt`, {
      cwd: './test/projects-scenarios/single-modified-binding'
    });

    assert.equal(output.toString(), '\nModule: ExampleModule\n' +
      '~ Contract:  Example\n');
    setImmediate(ctx);
  });

  it('should be able to show difference in modules - multiple modified binding', ctx => {
    const output = execSync(`../../../bin/run diff ./deployment/module.ts --network=${NETWORK_NAME} --noPrompt`, {
      cwd: './test/projects-scenarios/multiple-modified-binding'
    });

    assert.equal(output.toString(), `
Module: ExampleModule
~ Contract:  Example
~ Contract:  SecondExample
  └── Contract: Example
`);
    setImmediate(ctx);
  });

  it('should do nothing if their is no difference in module bindings', ctx => {
    const output = execSync(`../../../bin/run diff ./deployment/module.ts --network=${NETWORK_NAME} --noPrompt`, {
      cwd: './test/projects-scenarios/no-difference-in-binding'
    });

    assert.equal(output.toString(), 'Nothing changed from last revision - ExampleModule\n');
    setImmediate(ctx);
  });

  it('should fail if their is less bindings in modules compared to deployed one', ctx => {
    const output = execSync(`../../../bin/run diff ./deployment/module.ts --network=${NETWORK_NAME} --noPrompt`, {
      cwd: './test/projects-scenarios/less-bindings'
    });

    assert.equal(output.toString(), '\n' +
      'Module: ExampleModule\n');
    setImmediate(ctx);
  });
});
