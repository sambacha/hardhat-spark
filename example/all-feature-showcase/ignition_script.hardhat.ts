import hre from 'hardhat';
import '@tenderly/hardhat-ignition/src/hardhat';
// @ts-ignore
import {
  HardhatPluginIgnitionConfig,
  HardhatIgnition
} from '@tenderly/hardhat-ignition/src/usage_interfaces/hardhat_plugin';
import * as path from 'path';

const modulePath = './deployment/module.ts';
const networkId = '31337';

async function main() {
  // @ts-ignore
  const ign = hre.ignition as HardhatIgnition;

  await ign.deploy(path.resolve(process.cwd(), modulePath), {
    moduleFilePath: modulePath,
    networkName: 'local',
  });

  // just showcasing how to extract ignition config
  console.log(ign.conf as HardhatPluginIgnitionConfig);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
