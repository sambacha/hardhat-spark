//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "./ThirdExample.sol";

contract FourthExample {
  SecondExample addr;
  constructor(SecondExample _addr) {
    addr = _addr;
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }
}
