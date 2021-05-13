import * as hre from 'hardhat';
import { IIgnition } from 'ignition-core';
import 'ignition-hardhat-plugin';

const moduleFilePath = './deployment/module.ts';
const networkName = 'local';

async function main() {
  // @ts-ignore
  const ign = hre.ignition as IIgnition;
  await ign.deploy({
    moduleFilePath,
    networkName,
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
