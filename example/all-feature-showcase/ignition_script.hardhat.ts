import * as hre from 'hardhat';
import 'ignition-hardhat-plugin';

import { ExampleModule } from './deployment/module';
const networkName = 'local';

async function main() {
  const ign = hre.ignition;
  await ign.init(true, false);

  await ign.deploy(await ExampleModule, networkName, true);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
