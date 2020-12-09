//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

contract Example {
  uint256 example;

  constructor(int256 a, string memory b, uint256 c, bytes memory d, bool e, uint256 f, address g) {
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }

  function setExample(uint256 _example) public returns (bool) {
    example = _example;
    return true;
  }

  function getExample() public view returns (uint256) {
    return example;
  }
}
