# Module dependency resolving

Let's take this simple example of `A`, `B`, `C` contracts and `(B, C).afterDeploy()` event to show case how dependency
resolving is functioning.

![ModuleExample](../../images/module_example.png)

As you can see B and C cannot be deployed because they rely on `A` as a constructor param. So we will firstly ensure
that A is deployed, because it didn't rely on anything.

1. Deploy contract `A`

After successfully deploying contract `A` both `B` and `C` have their dependencies resolved, so we can execute either
one. We still cannot execute our event.

2. Deploy contract `B(A)`
3. Deploy contract `C(A)`

Upon execution of "last" needed dependencies of our event will be resolved.

4. Execute `afterDeploy` event hook after `B` and `C` has been deployed

### Representation with an array of classes after resolving

```
[
  ContractBinding(A), 
  ContractBinding(B), 
  ContractBinding(C), 
  StatefullEvent(afterDeployBandC)
]
```

### RAW JSON with explanation

```json
{
  "A": {
    "name": "A",
    // binding name (in case of template can be diffrent from contract name)
    "library": false,
    // this is true if this contract binding is library
    "args": [],
    // consturctor arguments
    "contractName": "A",
    // solidity contract name
    "deployMetaData": {
      "deploymentSpec": {
        "deps": []
      }
    },
    "eventsDeps": {
      "beforeCompile": [],
      "afterCompile": [],
      "beforeDeploy": [],
      "afterDeploy": [],
      "onChange": []
    },
    "bytecode": "0x123...",
    // contract bytecode
    "abi": [],
    // contract abi
    "libraries": {},
    // needed libraries
    "contractTxProgress": 0,
    // current number of contract function executed
    "signer": ethers.Signer,
    "prompter": ILogging,
    "txGenerator": EthTxGenerator,
    "moduleStateRepo": ModuleStateRepo,
    "eventTxExecutor": EventTxExecutor,
    "eventSession": Namespace
  },
  "B": {
    "name": "B",
    "library": false,
    "args": [
      ContractBinding(A)
    ],
    // constructor arguments, will be resolved as contract address
    "contractName": "B",
    "deployMetaData": {
      "deploymentSpec": {
        "deps": []
      }
    },
    "eventsDeps": {
      "beforeCompile": [],
      "afterCompile": [],
      "beforeDeploy": [],
      "afterDeploy": [
        "afterDeployBandC"
      ],
      // event dep
      "onChange": []
    },
    "bytecode": "0x124..",
    "abi": [],
    "libraries": {},
    "contractTxProgress": 0,
    "signer": ethers.Signer,
    "prompter": ILogging,
    "txGenerator": EthTxGenerator,
    "moduleStateRepo": ModuleStateRepo,
    "eventTxExecutor": EventTxExecutor,
    "eventSession": Namespace
  },
  "C": {
    "name": "C",
    "library": false,
    "args": [
      ContractBinding(A)
    ],
    "contractName": "C",
    "deployMetaData": {
      "deploymentSpec": {
        "deps": []
      }
    },
    "eventsDeps": {
      "beforeCompile": [],
      "afterCompile": [],
      "beforeDeploy": [],
      "afterDeploy": [
        "afterDeployBandC"
      ],
      // event dependencie
      "onChange": []
    },
    "bytecode": "0x124..",
    "abi": [],
    "libraries": {},
    "contractTxProgress": 0,
    "signer": ethers.Signer,
    "prompter": ILogging,
    "txGenerator": EthTxGenerator,
    "moduleStateRepo": ModuleStateRepo,
    "eventTxExecutor": EventTxExecutor,
    "eventSession": Namespace
  },
  "afterDeployBandC": {
    "event": {
      "name": "afterDeployBandC",
      "eventType": "AfterDeployEvent",
      "deps": [
        // contract dependecies
        "B",
        "C"
      ],
      "eventDeps": [],
      // event dependecies
      "usage": [],
      // contract usages
      "eventUsage": []
      // event usages
    },
    "executed": false,
    // if event is executed
    "txData": {}
    // all contract function transaction data
  }
}
```
