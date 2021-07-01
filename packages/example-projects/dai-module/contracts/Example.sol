//SPDX-License-Identifier: Unlicense
pragma solidity 0.5.12;

import "./Dai.sol";

contract Example {
  Dai example;

  constructor(Dai _example) public {
    example = _example;
  }

  function getDai() public view returns (Dai) {
    return example;
  }
}
