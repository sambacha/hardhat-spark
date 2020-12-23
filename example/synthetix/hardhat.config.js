/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.5.16",
  networks: {
    hardhat: {
      blockGasLimit: 15000000,
      allowUnlimitedContractSize: true
    }
  }
};
