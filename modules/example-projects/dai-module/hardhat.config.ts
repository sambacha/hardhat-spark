import "ignition-hardhat-plugin";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.5.12",
  networks: {
    local: {
      chainId: 31337,
      url: "http://localhost:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      ],
      mnemonic: "test test test test test test test test test test test junk",
      hdPath: "m/44'/60'/0'/0",
      localDeployment: true,
      blockConfirmation: 1,
    },
  },
};
