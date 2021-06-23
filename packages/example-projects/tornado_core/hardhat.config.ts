import * as dotenv from "dotenv";
import * as path from "path";
import("ignition-hardhat-plugin");
dotenv.config({ path: path.resolve(`${__dirname}/.env`) });

const { PRIVATE_KEY, INFURA_KEY } = process.env;
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.5.17",
  networks: {
    local: {
      chainId: 31337,
      url: "http://localhost:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      ],
      localDeployment: true,
      deploymentFilePath: "./deployment/tornado.module.ts",
      blockConfirmation: 1,
    },
    kovan: {
      chainId: 42,
      url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY as string],
      localDeployment: false,
      deploymentFilePath: "./deployment/module.ts",
      blockConfirmation: 4,
    },
  },
  ignition: {
    moduleParams: {
      MERKLE_TREE_HEIGHT: "20",
      ERC20_TOKEN: "",
      ETH_AMOUNT: "100000000000000000",
      TOKEN_AMOUNT: "100000000000000000",
    },
  },
};
