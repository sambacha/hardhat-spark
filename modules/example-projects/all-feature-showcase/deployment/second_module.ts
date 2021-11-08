import { ethers } from "ethers";
import { buildModule, ModuleBuilder } from "ignition-core";

import { ExampleModule } from "./module";

export const ThirdExampleModule = buildModule(
  "ThirdExampleModule",
  async (m: ModuleBuilder, wallets: ethers.Signer[]) => {
    await m.useModule(ExampleModule, undefined, wallets);

    m.contract("FourthExample", m.SecondExample);
  }
);
