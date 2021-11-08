import * as hre from "hardhat";
import "ignition-hardhat-plugin";

import { ExampleModule } from "./deployment/module";
const networkName = "local";

async function main() {
  // @ts-ignore
  const ign = hre.ignition;
  await ign.deploy(await ExampleModule, networkName);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
