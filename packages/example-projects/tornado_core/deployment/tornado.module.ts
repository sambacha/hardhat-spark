import { ethers } from "ethers";
import { buildModule, ModuleBuilder } from "ignition-core";

import { ERC20TornadoModule } from "./erc20_tornado.module";
import { ETHTornadoModule } from "./eth_tornado.module";
import { LibrariesModule } from "./libraries.module";

export const TornadoModule = buildModule(
  "TornadoModule",
  async (m: ModuleBuilder, signers: ethers.Signer[]) => {
    await m.useModule(LibrariesModule);

    await m.useModule(ETHTornadoModule, m.getAllParams(), signers);
    await m.useModule(ERC20TornadoModule, m.getAllParams(), signers);
  }
);
