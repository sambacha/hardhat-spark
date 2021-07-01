pragma solidity >= 0.5.0 < 0.6.0;

import './Child.sol';

contract Factory {
  Child[] public children;
  uint disabledCount;
  uint hello;

  event ChildCreated(address childAddress, uint data);

  function createChild(uint data) external {
    Child child = new Child(data, children.length);
    children.push(child);
    emit ChildCreated(address(child), data);
  }

  function getChildren() external view returns (Child[] memory _children){
    _children = new Child[](children.length - disabledCount);
    uint count;
    for (uint i = 0; i < children.length; i++) {
      if (children[i].isEnabled()) {
        _children[count] = children[i];
        count++;
      }
    }
  }

  function disable(Child child) external {
    children[child.index()].disable();
    disabledCount++;
  }
}
