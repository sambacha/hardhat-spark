import hre from 'hardhat';
import '@tenderly/hardhat-ignition/src/hardhat';

const moduleFilePath = './deployment/module.ts';
const networkName = 'local';

async function main() {
  const ign = hre.ignition;
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
