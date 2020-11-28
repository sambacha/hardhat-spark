//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./Example.sol";

contract SecondExample {
  Example addr;
  constructor(Example _addr, string[3] memory a, string[1][1] memory b, uint8 c) {
    addr = _addr;
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }
}
