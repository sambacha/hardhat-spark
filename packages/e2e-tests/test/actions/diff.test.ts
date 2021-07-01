import { assert } from "chai";
import { execSync } from "child_process";
import ux from "cli-ux";
import { ethers } from "ethers";
import { IgnitionCore, Module } from "ignition-core";
import * as path from "path";

import { loadStateFile } from "../utils/files";

const deploymentFolder = "deployment";
const defaultModuleFileName = "module.ts";
const networkName = "local";
const networkId = "31337";
const rootDir = process.cwd();
const testPrivateKeys = [
  new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  ),
  new ethers.Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  ),
];

// TODO: Remove this
export async function loadScript(filePath: string): Promise<any> {
  const m = require(filePath);
  return m.default ?? m;
}

describe("ignition diff - integration", () => {
  let output = "";
  const ignitionCoreTest = new IgnitionCore(
    {
      networkName,
      rpcProvider: new ethers.providers.JsonRpcProvider(),
      networkId,
      signers: testPrivateKeys,
      test: true,
      logging: false,
    },
    {},
    {}
  );

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

  before(async () => {
    await ignitionCoreTest.mustInit();
  });

  afterEach(() => {
    output = "";
    if (ignitionCoreTest?.moduleStateRepo !== undefined) {
      ignitionCoreTest.moduleStateRepo.clear();
    }
  });

  it("should be able to show difference in modules - single new binding", async () => {
    const projectDir = "single-new-binding";
    const projectLocation = path.resolve(
      rootDir,
      `./test/projects-scenarios/${projectDir}`
    );
    process.chdir(projectLocation);
    await loadStateFile(projectLocation, ignitionCoreTest);

    await runDiffCommand(ignitionCoreTest, projectLocation);

    assert.equal(
      output,
      `
Module: ExampleModule
+ Contract Example
`
    );
  });

  it("should be able to show difference in modules - multiple new bindings", async () => {
    const projectDir = "multiple-new-bindings";
    const projectLocation = path.resolve(
      rootDir,
      `./test/projects-scenarios/${projectDir}`
    );
    process.chdir(projectLocation);
    await loadStateFile(projectLocation, ignitionCoreTest);

    await runDiffCommand(ignitionCoreTest, projectLocation, "module.ts");

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

  it("should be able to show difference in modules - single modified binding", async () => {
    const projectDir = "single-modified-binding";
    const projectLocation = path.resolve(
      rootDir,
      `./test/projects-scenarios/${projectDir}`
    );
    process.chdir(projectLocation);
    await loadStateFile(projectLocation, ignitionCoreTest);

    await runDiffCommand(ignitionCoreTest, projectLocation, "module.ts");

    assert.equal(
      output,
      `
Module: ExampleModule
~ Contract:  Example
`
    );
  });

  it("should be able to show difference in modules - multiple modified binding", async () => {
    const projectDir = "multiple-modified-binding";
    const projectLocation = path.resolve(
      rootDir,
      `./test/projects-scenarios/${projectDir}`
    );
    process.chdir(projectLocation);
    await loadStateFile(projectLocation, ignitionCoreTest);

    await runDiffCommand(ignitionCoreTest, projectLocation, "module.ts");

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

  it("should do nothing if their is no difference in module bindings", async () => {
    const projectDir = "no-difference-in-binding";
    const projectLocation = path.resolve(
      rootDir,
      `./test/projects-scenarios/${projectDir}`
    );
    process.chdir(projectLocation);
    await loadStateFile(projectLocation, ignitionCoreTest);

    await runDiffCommand(ignitionCoreTest, projectLocation, "module.ts");

    assert.equal(
      output,
      "Nothing changed from last revision - ExampleModule\n"
    );
  });

  it("should fail if their is less bindings in modules compared to deployed one", async () => {
    const projectDir = "less-bindings";
    const projectLocation = path.resolve(
      rootDir,
      `./test/projects-scenarios/${projectDir}`
    );
    process.chdir(projectLocation);
    await loadStateFile(projectLocation, ignitionCoreTest);

    await runDiffCommand(ignitionCoreTest, projectLocation, "module.ts");

    assert.equal(
      output,
      `
Module: ExampleModule
`
    );
  });
});

async function runDiffCommand(
  ignition: IgnitionCore,
  projectLocation: string,
  moduleFileName: string = defaultModuleFileName
): Promise<void> {
  const deploymentFilePath = path.join(
    projectLocation,
    deploymentFolder,
    moduleFileName
  );

  execSync("npx hardhat compile");

  const modules = await loadScript(deploymentFilePath);
  for (const [, module] of Object.entries(modules)) {
    await ignition.diff(networkName, module as Module);
  }
}
