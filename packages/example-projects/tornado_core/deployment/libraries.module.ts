import { ethers } from "ethers";
import { buildModule, ModuleBuilder } from "ignition-core";

export const LibrariesModule = buildModule(
  "LibrariesModule",
  async (m: ModuleBuilder, signers: ethers.Signer[]) => {
    m.library("Hasher");
    m.library("Verifier");
  }
);
