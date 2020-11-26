//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "./Example.sol";

contract SecondExample {
  Example addr;
  constructor(Example _addr) {
    addr = _addr;
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }
}
