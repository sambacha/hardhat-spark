import hre from 'hardhat';
import '../../src/hardhat';
import { IgnitionHardhat } from '../../src/usage_interfaces/hardhat_plugin';
import * as path from 'path';

const modulePath = './deployment/module.ts';
const networkId = '31337';

async function main() {
  // @ts-ignore
  const ign = hre.ignition as IgnitionHardhat;

  await ign.deploy(path.resolve(process.cwd(), modulePath), {
    moduleFilePath: modulePath,
    networkId: networkId
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
