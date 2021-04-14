# Event hooks lifecycle

Events can be bounded to single contract, multiple contracts or to group of contract and events. In case of a single
contract.

**On Start** -> **Before Compile** -> **After Compile** -> **Before Deploy** -> **On Change(
conditional)** -> **After Deploy** -> **On Completion** -> **On Success (if succeeded)** -> **On
Error(if failed)**

## Contract Event hook

Event life cycle hooks are events(aka functions) called on specific life cycle state of the contract.

### Before Compile

Just before all contract compilation this event will be triggered. This is ideal if you desire to hotswap some contract
code in case of any dynamic data.

### After Compile

Just after all contract compilation. This is ideal for deletion or addition of some ABI functions or any metadata.

### Before Deploy

This event will be executed every time, just before, contract is scheduled for deployment. This means that if hardhat-ignition
decides that this contract shouldn't be deployed (e.g. it already did deploy) this event will not be triggered.

### After Deploy

This event will be executed every time, just after, contract is scheduled for deployment. This means that if hardhat-ignition
decides that this contract shouldn't be deployed (e.g. it already did deploy) this event will not be triggered.

### On change

This event will be triggered only if contract is going to be replaced/redeployed.

## Module Event hook

### On start

This will be run every time when module deployment is starting.

### On completion

This will be run every time when module deployment is finished/completed.

### On success

If there are no errors and everything deployed successfully.

### On Error

In case of error, this event hook will be triggered.
