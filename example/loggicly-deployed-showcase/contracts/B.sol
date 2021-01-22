//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

contract B {
  uint256 example;

  constructor() {
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }

  function setExample(uint256 _example) public returns (bool) {
    example = _example;
    return true;
  }
}
