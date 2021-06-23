import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { buildModule, ModuleBuilder } from "ignition-core";
dotenv.config({ path: "../.env" });

export const ETHTornadoModule = buildModule(
  "ETHTornadoModule",
  async (m: ModuleBuilder, wallets: ethers.Signer[]) => {
    m.contract(
      "ETHTornado",
      m.Verifier,
      m.ETH_AMOUNT,
      m.MERKLE_TREE_HEIGHT,
      await wallets[0].getAddress()
    );
  }
);
