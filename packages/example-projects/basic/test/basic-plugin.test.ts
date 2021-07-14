import { assert } from "chai";
import { ContractBindingMetaData } from "ignition-core";

import { FirstModule } from "../deployment/first.module";

import { getStateObject } from "./helper";

const networkName = "hardhat";

describe("ignition deploy", function () {
  describe("simple deploy test", async function () {
    it("should be able to deploy a module", async function () {
      process.env.HARDHAT_NETWORK = networkName;
      this.hre = require("hardhat");

      const ign = this.hre.ignition;
      await ign.init(false, false);

      const module = await FirstModule;
      await ign.deploy(module, networkName, true);

      const moduleStateFile = await getStateObject(
        ign?._ignitionCore,
        module.name
      );
      const contractBinding = (moduleStateFile.A as unknown) as ContractBindingMetaData;
      assert.isDefined(contractBinding?.deployMetaData?.contractAddress);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
    });
  });
});
