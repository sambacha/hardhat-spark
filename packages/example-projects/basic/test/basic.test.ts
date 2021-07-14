import { assert } from "chai";
import { ethers } from "ethers";
import { ContractBindingMetaData, IgnitionCore, Module } from "ignition-core";

import { getStateObject } from "./helper";

const networkName = "localhost";
const networkId = "31337";

const hardhatProvider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider();

const testPrivateKeys = [
  new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    hardhatProvider
  ),
  new ethers.Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    hardhatProvider
  ),
];

describe("ignition deploy", function () {
  describe("simple deploy test", async function () {
    const ignitionCore = new IgnitionCore(
      {
        networkName,
        networkId,
        rpcProvider: hardhatProvider,
        signers: testPrivateKeys,
        test: true,
        logging: false,
      },
      {},
      {}
    );
    it("should be able to deploy a module", async function () {
      const modules = require("../deployment/first.module");

      const firstModule = Object.entries<Module>(modules)[0][1];
      await ignitionCore.deploy(networkName, firstModule);

      const moduleStateFile = await getStateObject(
        ignitionCore,
        firstModule.name
      );
      const contractBinding = (moduleStateFile.A as unknown) as ContractBindingMetaData;
      assert.isDefined(contractBinding?.deployMetaData?.contractAddress);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
    });
  });
});
