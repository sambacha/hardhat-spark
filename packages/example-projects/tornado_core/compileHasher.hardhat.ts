import { task } from 'hardhat/config';
const path = require('path')
const fs = require('fs')
const genContract = require('circomlib/src/mimcsponge_gencontract.js')

const outputPath = path.join(__dirname, 'artifacts', 'contracts', 'MerkleTreeWithHistory.sol', 'Hasher.json')

task("compile",async (args, hre, runSuper) => {
  await runSuper();

  const contract = {
    "_format": "hh-sol-artifact-1",
    sourceName: "contracts/MerkleTreeWithHistory.sol",
    deployedBytecode: "0x",
    contractName: 'Hasher',
    abi: genContract.abi,
    bytecode: genContract.createCode('mimcsponge', 220),
    linkReferences: {},
    deployedLinkReferences: {}
  }

  fs.writeFileSync(outputPath, JSON.stringify(contract, undefined, 4))
});
