//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

contract Example {
  constructor(int256 a, string memory b, uint256 c, bytes memory d, bool e, uint256 f, address g) {
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }
}
