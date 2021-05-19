/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.5.17",
  ignition: {
    moduleParams: {
      MERKLE_TREE_HEIGHT: '20',
      ERC20_TOKEN: '',
      ETH_AMOUNT: '100000000000000000',
      TOKEN_AMOUNT: '100000000000000000'
    }
  }
};
