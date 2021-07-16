import { assert } from "chai";
import ux from "cli-ux";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { IgnitionCore, Module } from "ignition-core";
import * as path from "path";

import { loadStateFile } from "../utils/files";
import { initIgnition, useFixedProjectEnvironment } from "../utils/helpers";

const deploymentFolder = "deployment";
const defaultModuleFileName = "module.ts";
const rootDir = process.cwd();

// TODO: Remove this
export async function loadScript(filePath: string): Promise<any> {
  delete require.cache[filePath];
  const m = require(filePath);
  return m.default ?? m;
}

describe("ignition diff - integration", () => {
  let output = "";

  beforeEach(() => {
    process.chdir(rootDir);

    output = "";
    ux.info = function (format: string, ...args: string[]) {
      output += format;
      if (args.length > 0) {
        output += ` ${args.join(" ")}`;
      }
      output += "\n";
    };
  });

  describe("single new binding", function () {
    const projectDir = "single-new-binding";
    const projectLocation = useFixedProjectEnvironment(projectDir);
    initIgnition();

    it("should be able to show difference in modules", async function () {
      await loadStateFile(projectLocation, this.ignition);

      await runDiffCommand(this.ignition, this.hre, projectLocation);

      assert.equal(
        output,
        `
Module: ExampleModule
+ Contract Example
`
      );
    });
  });

  describe("multiple new bindings", function () {
    const projectDir = "multiple-new-bindings";
    const projectLocation = useFixedProjectEnvironment(projectDir);
    initIgnition();

    it("should be able to show difference in modules", async function () {
      await loadStateFile(projectLocation, this.ignition);

      await runDiffCommand(this.ignition, this.hre, projectLocation);

      assert.equal(
        output,
        `
Module: ExampleModule
+ Contract Example
+ Contract SecondExample
  └── Contract: Example
`
      );
    });
  });

  describe("single modified binding", function () {
    const projectDir = "single-modified-binding";
    const projectLocation = useFixedProjectEnvironment(projectDir);
    initIgnition();

    it("should be able to show difference in modules", async function () {
      await loadStateFile(projectLocation, this.ignition);

      await runDiffCommand(this.ignition, this.hre, projectLocation);

      assert.equal(
        output,
        `
Module: ExampleModule
~ Contract:  Example
`
      );
    });
  });

  describe("multiple modified binding", function () {
    const projectDir = "multiple-modified-binding";
    const projectLocation = useFixedProjectEnvironment(projectDir);
    initIgnition();

    it("should be able to show difference in modules", async function () {
      await loadStateFile(projectLocation, this.ignition);

      await runDiffCommand(this.ignition, this.hre, projectLocation);

      assert.equal(
        output,
        `
Module: ExampleModule
~ Contract:  Example
~ Contract:  SecondExample
  └── Contract: Example
`
      );
    });
  });

  describe("no-difference-in-binding", function () {
    const projectDir = "no-difference-in-binding";
    const projectLocation = useFixedProjectEnvironment(projectDir);
    initIgnition();

    it("should do nothing if their is no difference in module bindings", async function () {
      await loadStateFile(projectLocation, this.ignition);

      await runDiffCommand(this.ignition, this.hre, projectLocation);

      assert.equal(
        output,
        "Nothing changed from last revision - ExampleModule\n"
      );
    });
  });

  describe("less bindings", function () {
    const projectDir = "less-bindings";
    const projectLocation = useFixedProjectEnvironment(projectDir);
    initIgnition();

    it("should fail if their is less bindings in modules compared to deployed one", async function () {
      await loadStateFile(projectLocation, this.ignition);

      await runDiffCommand(this.ignition, this.hre, projectLocation);

      assert.equal(
        output,
        `
Module: ExampleModule
`
      );
    });
  });
});

async function runDiffCommand(
  ignition: IgnitionCore,
  hardhatRuntime: HardhatRuntimeEnvironment,
  projectLocation: string,
  moduleFileName: string = defaultModuleFileName
): Promise<void> {
  const deploymentFilePath = path.join(
    projectLocation,
    deploymentFolder,
    moduleFileName
  );

  await hardhatRuntime.run("compile");
  const networkName = hardhatRuntime.network.name;

  const modules = await loadScript(deploymentFilePath);
  for (const [, module] of Object.entries(modules)) {
    await ignition.diff(networkName, module as Module);
  }
}
