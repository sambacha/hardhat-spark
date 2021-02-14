//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

contract A {
  uint256 example;

  constructor() {
  }

  function hello() public pure returns (string memory) {
    return "hellooooo";
  }

  function setExample(uint256 _example) public returns (bool) {
    example = _example;
    return true;
  }
}
