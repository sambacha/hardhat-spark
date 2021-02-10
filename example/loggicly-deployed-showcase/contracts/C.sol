//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "./A.sol";

contract C {
  uint256 example;

  constructor(A a) {
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }

  function setExample(uint256 _example) public returns (bool) {
    example = _example;
    return true;
  }
}
