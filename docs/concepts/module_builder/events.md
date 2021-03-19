# Event hooks lifecycle

Events can be bounded to single contract, multiple contracts or to group of contract and events. In case of a single
contract.

**On Start** -> **Before Compile** -> **After Compile** -> **Before Deployment** -> **Before Deploy** -> **On Change(
conditional)** -> **After Deploy** -> **After Deployment** -> **On Completion** -> **On Success (if succeeded)** -> **On
Error(if failed)**

## Contract Event hook

Event life cycle hooks are events(aka functions) called on specific life cycle state of the contract.

### Before Compile

Just before all contract compilation this event will be triggered. This is ideal if you desire to hotswap some contract
code in case of any dynamic data.

### After Compile

Just after all contract compilation. This is ideal for deletion or addition of some ABI functions or any metadata.

### Before Deployment

This event will be executed every time when ignition arrives to deployment of contract's that event is bound to. This
means that if ignition decides that this contract shouldn't be deployed (e.g. it already did deploy) this event will be
triggered.

### Before Deploy

Similar to <b>Before Deployment</b> just this event is going to be executed only if contract is actually being deployed

### After Deploy

Similar to <b>After Deployment</b> just this event is going to be executed only if contract is actually being deployed

### After Deployment

This event will be executed every time when ignition finish contract deployment of the contract that event is bounded to.
This means that if ignition has decided that that contract shouldn't be deployed (e.g. it already did deploy) this event
will be triggered.

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
