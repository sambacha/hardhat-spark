import { assert } from "chai";
import hre from "hardhat";
import { ContractBindingMetaData } from "ignition-core";

import { FirstModule } from "../deployment/first.module";

import { getStateObject } from "./helper";

describe("ignition deploy", function () {
  describe("simple deploy test", async function () {
    it("should be able to deploy a module", async function () {
      const ign = hre.ignition;
      await ign.init(false, false);

      const module = await FirstModule;
      await ign.deploy(module, hre.network.name, true);

      const moduleStateFile = await getStateObject(
        (ign as any)._ignitionCore,
        module.name
      );
      const contractBinding = (moduleStateFile.A as unknown) as ContractBindingMetaData;
      assert.isDefined(contractBinding?.deployMetaData?.contractAddress);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
    });
  });
});
