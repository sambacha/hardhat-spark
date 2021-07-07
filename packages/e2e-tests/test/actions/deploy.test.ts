import { assert } from "chai";
import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  ContractBindingMetaData,
  IgnitionCore,
  Module,
  ModuleParams,
} from "ignition-core";
import * as path from "path";

import { getStateObject, loadStateFile } from "../utils/files";
import {
  initIgnition,
  useExampleProjectsEnvironment,
  useFixedProjectEnvironment,
} from "../utils/helpers";

const deploymentFolder = "deployment";

// TODO: Remove this
export function loadScript(filePath: string): any {
  const m = require(filePath);
  return m.default ?? m;
}

const moduleName = "ExampleModule";
const moduleFileName = "module.ts";

describe("ignition deploy", function () {
  describe("project scenarios", function () {
    describe("single new binding", async function () {
      const projectFileName = "single-new-binding";
      const projectLocation = useFixedProjectEnvironment(projectFileName);
      initIgnition();

      it("should be able to deploy a module", async function () {
        await loadStateFile(projectLocation, this.ignition, moduleName);
        await runDeployCommand(
          this.ignition,
          this.hardhatEnvironment,
          projectLocation
        );

        const moduleStateFile = await getStateObject(this.ignition, moduleName);
        const contractBinding = (moduleStateFile.Example as unknown) as ContractBindingMetaData;
        assert.isDefined(contractBinding?.deployMetaData?.contractAddress);
        assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
      });
    });

    describe("multiple new bindings", function () {
      const projectFileName = "multiple-new-bindings";
      const projectLocation = useFixedProjectEnvironment(projectFileName);
      initIgnition();

      it("should be able to deploy module", async function () {
        await loadStateFile(projectLocation, this.ignition, moduleName);
        await runDeployCommand(
          this.ignition,
          this.hardhatEnvironment,
          projectLocation
        );

        const moduleStateFile = await getStateObject(this.ignition, moduleName);

        const firstContractBinding = (moduleStateFile.Example as unknown) as ContractBindingMetaData;
        const secondContractBinding = (moduleStateFile.SecondExample as unknown) as ContractBindingMetaData;

        assert.isDefined(firstContractBinding?.deployMetaData?.contractAddress);
        assert.equal(
          firstContractBinding.deployMetaData.logicallyDeployed,
          true
        );

        assert.isDefined(
          secondContractBinding?.deployMetaData?.contractAddress
        );
        assert.equal(
          secondContractBinding.deployMetaData.logicallyDeployed,
          true
        );
      });
    });

    describe("single modified binding", function () {
      const projectFileName = "single-modified-binding";
      const projectLocation = useFixedProjectEnvironment(projectFileName);
      initIgnition();

      it("should be able to deploy module", async function () {
        await loadStateFile(projectLocation, this.ignition, moduleName);
        const moduleStateFileBefore = await getStateObject(
          this.ignition,
          moduleName
        );

        await runDeployCommand(
          this.ignition,
          this.hardhatEnvironment,
          projectLocation
        );
        const moduleStateFileAfter = await getStateObject(
          this.ignition,
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
        assert.equal(
          contractBindingAfter.deployMetaData.logicallyDeployed,
          true
        );
      });
    });

    describe("multiple modified binding", function () {
      const projectFileName = "multiple-modified-binding";
      const projectLocation = useFixedProjectEnvironment(projectFileName);
      initIgnition();

      it("should be able to deploy module", async function () {
        await loadStateFile(projectLocation, this.ignition, moduleName);
        const moduleStateFileBefore = await getStateObject(
          this.ignition,
          moduleName
        );

        await runDeployCommand(
          this.ignition,
          this.hardhatEnvironment,
          projectLocation
        );
        const moduleStateFileAfter = await getStateObject(
          this.ignition,
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
    });

    describe("no-difference-in-binding", function () {
      const projectFileName = "no-difference-in-binding";
      const projectLocation = useFixedProjectEnvironment(projectFileName);
      initIgnition();

      it("should do nothing if their is no difference in modules", async function () {
        await loadStateFile(projectLocation, this.ignition, moduleName);
        const oldModuleStateFile = await getStateObject(
          this.ignition,
          moduleName
        );

        await runDeployCommand(
          this.ignition,
          this.hardhatEnvironment,
          projectLocation
        );

        const newModuleStateFile = await getStateObject(
          this.ignition,
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
    });

    describe("less-bindings", function () {
      const projectFileName = "less-bindings";
      const projectLocation = useFixedProjectEnvironment(projectFileName);
      initIgnition();

      it("should do nothing if their is less bindings in modules compared to deployed one", async function () {
        await loadStateFile(projectLocation, this.ignition, moduleName);
        await runDeployCommand(
          this.ignition,
          this.hardhatEnvironment,
          projectLocation
        );

        const moduleStateFile = await getStateObject(this.ignition, moduleName);
        const contractBinding = (moduleStateFile.Example as unknown) as ContractBindingMetaData;
        assert.isDefined(contractBinding?.deployMetaData?.contractAddress);
        assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
      });
    });
  });

  describe("example projects - sync", function () {
    runExamples();
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

function runExamples(skipSynthethix: boolean = false) {
  describe("examples/all-feature-showcase", function () {
    const projectFileName = "all-feature-showcase";
    const projectLocation = useExampleProjectsEnvironment(projectFileName);
    initIgnition({}, true);

    it("should be able to execute", async function () {
      await runDeployCommand(
        this.ignition,
        this.hardhatEnvironment,
        projectLocation,
        "module.ts"
      );
    });
  });

  describe("examples/basic", function () {
    const projectFileName = "basic";
    const projectLocation = useExampleProjectsEnvironment(projectFileName);
    initIgnition({}, true);

    it("should be able to execute", async function () {
      await runDeployCommand(
        this.ignition,
        this.hardhatEnvironment,
        projectLocation,
        "first.module.ts"
      );
    });
  });

  describe("examples/dai-module", function () {
    const projectFileName = "dai-module";
    const projectLocation = useExampleProjectsEnvironment(projectFileName);
    initIgnition({}, true);

    it("should be able to execute", async function () {
      await runDeployCommand(
        this.ignition,
        this.hardhatEnvironment,
        projectLocation,
        "module.ts"
      );
    });
  });

  describe("examples/intermediate", function () {
    const projectFileName = "intermediate";
    const projectLocation = useExampleProjectsEnvironment(projectFileName);
    initIgnition({}, true);

    it("should be able to execute", async function () {
      await runDeployCommand(
        this.ignition,
        this.hardhatEnvironment,
        projectLocation,
        "root.module.ts"
      );
    });
  });

  describe("examples/patterns - factory", function () {
    const projectFileName = "patterns";
    const projectLocation = useExampleProjectsEnvironment(projectFileName);
    initIgnition({}, true);

    it("should be able to execute", async function () {
      await runDeployCommand(
        this.ignition,
        this.hardhatEnvironment,
        projectLocation,
        "factory.module.ts"
      );
    });
  });

  describe("examples/patterns - proxy", function () {
    const projectFileName = "patterns";
    const projectLocation = useExampleProjectsEnvironment(projectFileName);
    initIgnition({}, true);

    it("should be able to execute", async function () {
      await runDeployCommand(
        this.ignition,
        this.hardhatEnvironment,
        projectLocation,
        "proxy.module.ts"
      );
    });
  });

  describe("examples/tornado_core", function () {
    const projectFileName = "tornado_core";
    const projectLocation = useExampleProjectsEnvironment(projectFileName);
    const moduleParams = loadModuleParams(projectLocation);
    initIgnition(moduleParams, true);

    it("should be able to execute", async function () {
      await runDeployCommand(
        this.ignition,
        this.hardhatEnvironment,
        projectLocation,
        "tornado.module.ts"
      );
    });
  });

  if (!skipSynthethix) {
    describe("examples/synthetix", function () {
      const projectFileName = "synthetix";
      const projectLocation = useExampleProjectsEnvironment(projectFileName);
      const moduleParams = loadModuleParams(projectLocation);
      initIgnition(moduleParams, true);

      it("should be able to execute", async function () {
        await runDeployCommand(
          this.ignition,
          this.hardhatEnvironment,
          projectLocation,
          "module.ts"
        );
      }).timeout(200000); // on average it takes around ~160s
    });
  }
}

async function runDeployCommand(
  ignition: IgnitionCore,
  hardhatRuntime: HardhatRuntimeEnvironment,
  projectLocation: string,
  projectFileName: string = moduleFileName
): Promise<void> {
  const deploymentFilePath = path.resolve(
    projectLocation,
    deploymentFolder,
    projectFileName
  );
  const modules = await loadScript(deploymentFilePath);

  if (!projectFileName.includes("tornado")) {
    await hardhatRuntime.run("compile");
  }
  const networkName = hardhatRuntime.network.name;

  for (const [, module] of Object.entries<Module>(modules)) {
    await ignition.deploy(networkName, module);
  }
}

function loadModuleParams(projectLocation: string): Promise<ModuleParams> {
  let config: any = {};
  try {
    const configFileJs = path.resolve(
      projectLocation,
      "deployment",
      "module.params.js"
    );
    config = loadScript(configFileJs);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      const configFileTs = path.resolve(
        projectLocation,
        "deployment",
        "module.params.ts"
      );
      config = loadScript(configFileTs);
    } else {
      throw e;
    }
  }

  return config.moduleParams ?? {};
}
