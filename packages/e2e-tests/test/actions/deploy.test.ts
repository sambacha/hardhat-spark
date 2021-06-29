import { assert } from "chai";
import { execSync } from "child_process";
import { ethers } from "ethers";
import { ContractBindingMetaData, IgnitionCore, Module } from "ignition-core";
import * as path from "path";

import { getStateObject, loadStateFile } from "../utils/files";

const deploymentFolder = "deployment";
const networkId = "31337";
const networkName = "local";
const defaultProvider = new ethers.providers.JsonRpcProvider();

// TODO: Remove this
export async function loadScript(filePath: string): Promise<any> {
  const m = require(filePath);
  return m.default ?? m;
}

// @TODO move this to tests
const testPrivateKeys = [
  new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    defaultProvider
  ),
  new ethers.Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    defaultProvider
  ),
];
const moduleName = "ExampleModule";
const moduleFileName = "module.ts";
const rootDir = process.cwd();

describe("ignition deploy", () => {
  const ignitionCoreTest = new IgnitionCore(
    {
      networkName,
      networkId,
      rpcProvider: defaultProvider,
      signers: testPrivateKeys,
      test: true,
      logging: false,
    },
    {},
    {}
  );
  before(async () => {
    await ignitionCoreTest.mustInit();
  });
  afterEach(() => {
    if (ignitionCoreTest?.moduleStateRepo !== undefined) {
      ignitionCoreTest.moduleStateRepo.clear();
    }
    process.chdir(rootDir);

    // resolving same reference of an object that is required multiple times
    require.cache = {};
  });

  describe("ignition deploy - integration", () => {
    it("should be able to deploy module - single new binding", async () => {
      const projectFileName = "single-new-binding";
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignitionCoreTest, moduleName);
      await runDeployCommand(ignitionCoreTest, projectLocation);

      const moduleStateFile = await getStateObject(
        ignitionCoreTest,
        moduleName
      );
      const contractBinding = (moduleStateFile.Example as unknown) as ContractBindingMetaData;
      assert.isDefined(contractBinding?.deployMetaData?.contractAddress);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
    });

    it("should be able to deploy module - multiple new bindings", async () => {
      const projectFileName = "multiple-new-bindings";
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignitionCoreTest, moduleName);
      await runDeployCommand(ignitionCoreTest, projectLocation);

      const moduleStateFile = await getStateObject(
        ignitionCoreTest,
        moduleName
      );

      const firstContractBinding = (moduleStateFile.Example as unknown) as ContractBindingMetaData;
      const secondContractBinding = (moduleStateFile.SecondExample as unknown) as ContractBindingMetaData;

      assert.isDefined(firstContractBinding?.deployMetaData?.contractAddress);
      assert.equal(firstContractBinding.deployMetaData.logicallyDeployed, true);

      assert.isDefined(secondContractBinding?.deployMetaData?.contractAddress);
      assert.equal(
        secondContractBinding.deployMetaData.logicallyDeployed,
        true
      );
    });

    it("should be able to deploy module - single modified binding", async () => {
      const projectFileName = "single-modified-binding";
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignitionCoreTest, moduleName);
      const moduleStateFileBefore = await getStateObject(
        ignitionCoreTest,
        moduleName
      );

      await runDeployCommand(ignitionCoreTest, projectLocation);
      const moduleStateFileAfter = await getStateObject(
        ignitionCoreTest,
        moduleName
      );

      const contractBindingBefore = (moduleStateFileBefore.Example as unknown) as ContractBindingMetaData;
      const contractBindingAfter = (moduleStateFileAfter.Example as unknown) as ContractBindingMetaData;
      assert.equal(
        contractBindingBefore.deployMetaData.contractAddress !==
          contractBindingAfter.deployMetaData.contractAddress,
        true
      );
      assert.equal(
        contractBindingBefore.deployMetaData.logicallyDeployed,
        true
      );
      assert.equal(contractBindingAfter.deployMetaData.logicallyDeployed, true);
    });

    it("should be able to deploy module - multiple modified binding", async () => {
      const projectFileName = "multiple-modified-binding";
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignitionCoreTest, moduleName);
      const moduleStateFileBefore = await getStateObject(
        ignitionCoreTest,
        moduleName
      );

      await runDeployCommand(ignitionCoreTest, projectLocation);
      const moduleStateFileAfter = await getStateObject(
        ignitionCoreTest,
        moduleName
      );

      const firstContractBindingBefore = (moduleStateFileBefore.Example as unknown) as ContractBindingMetaData;
      const firstContractBindingAfter = (moduleStateFileAfter.Example as unknown) as ContractBindingMetaData;

      const secondContractBindingBefore = (moduleStateFileBefore.SecondExample as unknown) as ContractBindingMetaData;
      const secondContractBindingAfter = (moduleStateFileAfter.SecondExample as unknown) as ContractBindingMetaData;

      assert.equal(
        firstContractBindingBefore.deployMetaData.contractAddress !==
          firstContractBindingAfter.deployMetaData.contractAddress,
        true
      );
      assert.equal(
        firstContractBindingBefore.deployMetaData.logicallyDeployed,
        true
      );
      assert.equal(
        firstContractBindingAfter.deployMetaData.logicallyDeployed,
        true
      );

      assert.equal(
        secondContractBindingBefore.deployMetaData.contractAddress !==
          secondContractBindingAfter.deployMetaData.contractAddress,
        true
      );
      assert.equal(
        secondContractBindingBefore.deployMetaData.logicallyDeployed,
        true
      );
      assert.equal(
        secondContractBindingAfter.deployMetaData.logicallyDeployed,
        true
      );
    });

    it("should do nothing if their is no difference in modules", async () => {
      const projectFileName = "no-difference-in-binding";
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignitionCoreTest, moduleName);
      const oldModuleStateFile = await getStateObject(
        ignitionCoreTest,
        moduleName
      );

      await runDeployCommand(ignitionCoreTest, projectLocation);

      const newModuleStateFile = await getStateObject(
        ignitionCoreTest,
        moduleName
      );

      const newContractBinding = (newModuleStateFile.Example as unknown) as ContractBindingMetaData;
      const oldContractBinding = (oldModuleStateFile.Example as unknown) as ContractBindingMetaData;
      assert.equal(
        newContractBinding.deployMetaData.contractAddress,
        oldContractBinding.deployMetaData.contractAddress
      );
      assert.equal(newContractBinding.deployMetaData.logicallyDeployed, true);
      assert.equal(oldContractBinding.deployMetaData.logicallyDeployed, true);
    });

    it("should do nothing if their is less bindings in modules compared to deployed one", async () => {
      const projectFileName = "less-bindings";
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignitionCoreTest, moduleName);
      await runDeployCommand(ignitionCoreTest, projectLocation);

      const moduleStateFile = await getStateObject(
        ignitionCoreTest,
        moduleName
      );
      const contractBinding = (moduleStateFile.Example as unknown) as ContractBindingMetaData;
      assert.isDefined(contractBinding?.deployMetaData?.contractAddress);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
    });
  });

  describe("ignition deploy - examples - sync", () => {
    runExamples(ignitionCoreTest);
  });

  // describe("ignition deploy - examples - parallel", () => {
  //   const ignitionParallelMode = new IgnitionCore(
  //     {
  //       networkName,
  //       networkId,
  //       signers: testPrivateKeys,
  //       parallelizeDeployment: true,
  //     },
  //     {},
  //     {}
  //   );
  //   runExamples(ignitionParallelMode, true);
  // });
});

function runExamples(ignition: IgnitionCore, skipSynthethix: boolean = false) {
  it("should be able to run - examples/all-feature-showcase", async () => {
    const projectFileName = "all-feature-showcase";
    const projectLocation = path.resolve(
      rootDir,
      `../example-projects/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, "module.ts");
  }).timeout(10000);

  it("should be able to run - examples/basic", async () => {
    const projectFileName = "basic";
    const projectLocation = path.resolve(
      rootDir,
      `../example-projects/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, "first.module.ts");
  });

  it("should be able to run - examples/dai-module", async () => {
    const projectFileName = "dai-module";
    const projectLocation = path.resolve(
      rootDir,
      `../example-projects/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, "module.ts");
  });

  it("should be able to run - examples/intermediate", async () => {
    const projectFileName = "intermediate";
    const projectLocation = path.resolve(
      rootDir,
      `../example-projects/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, "root.module.ts");
  });

  it("should be able to run - examples/patterns - factory", async () => {
    const projectFileName = "patterns";
    const projectLocation = path.resolve(
      rootDir,
      `../example-projects/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, "factory.module.ts");
  });

  it("should be able to run - examples/patterns - proxy", async () => {
    const projectFileName = "patterns";
    const projectLocation = path.resolve(
      rootDir,
      `../example-projects/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, "proxy.module.ts");
  });

  it("should be able to run - examples/tornado_core", async () => {
    const projectFileName = "tornado_core";
    const projectLocation = path.resolve(
      rootDir,
      `../example-projects/${projectFileName}`
    );
    process.chdir(projectLocation);
    await loadModuleParams(ignition, projectLocation);

    await runDeployCommand(ignition, projectLocation, "tornado.module.ts");
  }).timeout(10000);

  if (!skipSynthethix) {
    it("should be able to run - examples/synthetix", async () => {
      const projectFileName = "synthetix";
      const projectLocation = path.resolve(
        rootDir,
        `../example-projects/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadModuleParams(ignition, projectLocation);

      await runDeployCommand(ignition, projectLocation, "module.ts");
    }).timeout(200000); // ~160s normal running time
  }
}

async function runDeployCommand(
  ignition: IgnitionCore,
  projectLocation: string,
  projectFileName: string = moduleFileName
): Promise<void> {
  // @TODO run contracts compilation somewhere around here
  const deploymentFilePath = path.resolve(
    projectLocation,
    deploymentFolder,
    projectFileName
  );
  const modules = await loadScript(deploymentFilePath);

  execSync("npx hardhat compile");

  for (const [, module] of Object.entries<Module>(modules)) {
    await ignition.deploy(networkName, module, false, true);
  }
}

async function loadModuleParams(
  ignition: IgnitionCore,
  projectLocation: string
): Promise<void> {
  let config: any = {};
  try {
    const configFileJs = path.resolve(
      projectLocation,
      "deployment",
      "module.params.js"
    );
    config = await loadScript(configFileJs);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      const configFileTs = path.resolve(
        projectLocation,
        "deployment",
        "module.params.ts"
      );
      config = await loadScript(configFileTs);
    } else {
      throw e;
    }
  }

  await ignition.mustInit(
    ignition.params,
    ignition.customServices,
    config.moduleParams
  );
}
