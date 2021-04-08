# Deploy module

Deploying module is action in hardhat-ignition that has a goal of setting up smart-contract infrastructure for desired
environment.

# Execution option

There are multiple ways that you can execute this action:

Command:

```
hardhat-ignition deploy <MODULE_FILE_PATH> --networkId=<NETWORK_ID>
```

Hardhat plugin action:

```
npx hardhat ignition:deploy <MODULE_FILE_PATH> --network-id <NETWORK_ID>
```

## Actions to be executed

Deploy is a rather complex process that has to occur in order for smart-contract infra to be considered deployed. We'll
try to raffle explain what is happening.

1. User/developer is writing his deployment script and specifying contracts and events on top of `ModuleBuilder` object.
2. Upon running command `buildModule` function is "building" `Module` object with more contract related meta-data.
3. The same `Module` object is dispatched to the resolver function in order for his intertwined dependencies to be
   resolved.
4. After deployment pipeline is established, `hardhat-ignition` determining if there is any already deployed
   dependencies and what should be skipped in current deployment.
5. Next step is for `hardhat-igntion` to start step-by-step process of fetching current state file, executing single
   element(contract or event) in deployment pipeline, and finally store the result.
6. Step 5 is repeated while there are elements that need to be executed.
