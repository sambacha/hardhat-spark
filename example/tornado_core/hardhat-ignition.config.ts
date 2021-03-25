import { HardhatIgnitionConfig } from '../../src/packages/types/config';
import path from 'path';

require('dotenv').config({path: path.resolve(__dirname + '/.env')});

const {
  MERKLE_TREE_HEIGHT,
  ERC20_TOKEN,
  TOKEN_AMOUNT,
  ETH_AMOUNT,
} = process.env;

export const config: HardhatIgnitionConfig = {
  params: {
    merkleTreeHeight: MERKLE_TREE_HEIGHT,
    erc20Token: ERC20_TOKEN,
    ethAmount: ETH_AMOUNT,
    tokenAmount: TOKEN_AMOUNT
  }
};
