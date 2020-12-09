//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "./SecondExample.sol";

contract ThirdExample {
  SecondExample addr;
  constructor(SecondExample _addr) {
    addr = _addr;
  }

  function hello() public pure returns (string memory) {
    return "hello";
  }
}
