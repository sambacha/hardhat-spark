pragma solidity >= 0.5.0 < 0.6.0;

contract Child {
  uint256 data;
  bool public isEnabled;
  uint256 public index;

  constructor(uint256 _data, uint256 _index) public {
    data = _data;
    isEnabled = true;
    index = _index;
  }

  function disable() external {
    isEnabled = false;
  }
}
