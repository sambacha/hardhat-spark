import hre from 'hardhat';
import '../../src/hardhat';
import { HardhatPluginIgnitionConfig, HardhatIgnition } from '../../src/usage_interfaces/hardhat_plugin';
import * as path from 'path';

const modulePath = './deployment/module.ts';
const networkId = '31337';

async function main() {
  // @ts-ignore
  const ign = hre.ignition as HardhatIgnition;

  await ign.deploy(path.resolve(process.cwd(), modulePath), {
    moduleFilePath: modulePath,
    networkId: networkId
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
