pragma solidity >= 0.5.0 < 0.6.0;

import './Storage.sol';

contract LogicOne is Storage {
  function setVal(uint _val) public returns (bool success) {
    val = 2 * _val;
    return true;
  }
}
