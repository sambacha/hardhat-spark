# Module State file

```typescript
ModuleState: { [p: string]: ContractBindingMetaData | StatefulEvent }
```

## Contract Binding

```typescript
export class ContractBindingMetaData {
  public name: string;
  public contractName: string;
  public args: Arguments;
  public bytecode: string | undefined;
  public abi: JsonFragment[] | undefined;
  public libraries: SingleContractLinkReference | undefined;
  public txData: TransactionData | undefined;
  public deployMetaData: Deployed;
}
```

### Contract binding deployment data

```typescript
txData: TransactionData | undefined
```

<hr>

Field `deployMetaData` is most important filed in state file for our contract binding, it stores all relevant data about current deployment state of contracts.

```typescript
export type Deployed = {
  lastEventName: string | undefined,
  logicallyDeployed: boolean | undefined,
  contractAddress: string | undefined,
  shouldRedeploy: ShouldRedeployFn | undefined,
  deploymentSpec: {
    deployFn: DeployFn | undefined,
    deps: (ContractBinding | ContractEvent)[]
  } | undefined,
};

deployMetaData: Deployed;
```

<hr>

Name of last event that depends on this contract binding. So if their two events that are binded to this contract binding this field will be name of event that is deepest in resolved module array (see [module resolving](../module_deps_resovler/module_deps_resolver.md)).

```typescript
  lastEventName: string | undefined
```

<hr>

When `lastEventName` is executed then `logicallyDeployed` flag is set to true. This flag is relevant in order to determen if contract binding can be used as `usage` or as `dependecy` in event hooks.

```typescript
logicallyDeployed: boolean | undefined
```

<hr>

Deployed contract address, populated when contract is deployed.

```typescript
contractAddress: string | undefined
```

<hr>

## State events

```typescript
export class StatefulEvent {
  public event: Event;
  public executed: boolean;
  public txData: { [bindingName: string]: EventTransactionData };
}
```

<hr>

This field specifies if event is executed, this means that all contract function are finished and user defined event hook function executed successfully.

```typescript
  public executed: boolean;
```

### Event deployment data 

This field will store every contract binding function call and transaction execution. This way we can track what contract call don't need to be executed in case of an error or deployment termination.

For example, we have 3 contract function execution on contract binding named `A` inside `afterDeploy()` event. For some reason it fails while running and only 2 contract function's are executed. If user reruns deploy command, even doe event doesn't have `executed: true` it will rerun event but it will not send already executed transaction, it will just return already stored transaction receipt.

```typescript
txData: { [bindingName: string]: EventTransactionData };
```

```typescript
export type EventTransactionData = {
  contractInput: (ContractInput | TransactionRequest)[]
  contractOutput: TransactionResponse[]
};
```

# Raw json 
```json
{
  "A": {
    "name": "A",
    "contractName": "A",
    "args": [],
    "bytecode": "",
    "abi": [],
    "libraries": {},
    "txData": {
      "input": {
        "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "input": "0x608060405234801561001057600080fd5b50610187806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806319ff1d211461003b5780637254ef5b146100be575b600080fd5b610043610102565b6040518080602001828103825283818151815260200191508051906020019080838360005b83811015610083578082015181840152602081019050610068565b50505050905090810190601f1680156100b05780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6100ea600480360360208110156100d457600080fd5b810190808035906020019092919050505061013f565b60405180821515815260200191505060405180910390f35b60606040518060400160405280600581526020017f68656c6c6f000000000000000000000000000000000000000000000000000000815250905090565b6000816000819055506001905091905056fea2646970667358221220322a0c8373d094742e52c5a78b4830e3252dc65d66fe98ff5277cb3acc04cb6264736f6c63430007030033"
      },
      "output": {
        "to": null,
        "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "contractAddress": "0x74Df809b1dfC099E8cdBc98f6a8D1F5c2C3f66f8",
        "transactionIndex": 0,
        "gasUsed": {
          "type": "BigNumber",
          "hex": "0x021901"
        },
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "blockHash": "0x88108d4a1b6f20215d297c4c791add9c0e17f4af5e0cda53f6f07f3b71c27382",
        "transactionHash": "0xaa123d01c897211b659ea2d7e7efd8c05fead925f6f921285820c59b2e66989c",
        "logs": [],
        "blockNumber": 339,
        "confirmations": 1,
        "cumulativeGasUsed": {
          "type": "BigNumber",
          "hex": "0x021901"
        },
        "status": 1,
        "byzantium": true
      }
    },
    "deployMetaData": {
      "logicallyDeployed": true,
      "contractAddress": "0x74Df809b1dfC099E8cdBc98f6a8D1F5c2C3f66f8",
      "deploymentSpec": {
        "deps": []
      }
    }
  },
  "B": {
    "name": "B",
    "contractName": "B",
    "args": [
      "A"
    ],
    "bytecode": "",
    "abi": [],
    "libraries": {},
    "txData": {
      "input": {
        "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "input": "0x608060405234801561001057600080fd5b506040516101db3803806101db8339818101604052602081101561003357600080fd5b810190808051906020019092919050505050610187806100546000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806319ff1d211461003b5780637254ef5b146100be575b600080fd5b610043610102565b6040518080602001828103825283818151815260200191508051906020019080838360005b83811015610083578082015181840152602081019050610068565b50505050905090810190601f1680156100b05780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6100ea600480360360208110156100d457600080fd5b810190808035906020019092919050505061013f565b60405180821515815260200191505060405180910390f35b60606040518060400160405280600581526020017f68656c6c6f000000000000000000000000000000000000000000000000000000815250905090565b6000816000819055506001905091905056fea264697066735822122071cc95d534c92a06a930de900d0f3ec747227132b3e43ecc21b1f357c2df9f4e64736f6c63430007030033"
      },
      "output": {
        "to": null,
        "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "contractAddress": "0x3f9A1B67F3a3548e0ea5c9eaf43A402d12b6a273",
        "transactionIndex": 0,
        "gasUsed": {
          "type": "BigNumber",
          "hex": "0x021e0e"
        },
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "blockHash": "0x167dba5a87dfc15c4f5b6a7d56964b57bbf49cb646869712768e5f8d012f89b5",
        "transactionHash": "0x1cdeb46ff55314f3fb397200bd40a699997c26cc435184db74fead54c2fc831d",
        "logs": [],
        "blockNumber": 340,
        "confirmations": 1,
        "cumulativeGasUsed": {
          "type": "BigNumber",
          "hex": "0x021e0e"
        },
        "status": 1,
        "byzantium": true
      }
    },
    "deployMetaData": {
      "logicallyDeployed": true,
      "contractAddress": "0x3f9A1B67F3a3548e0ea5c9eaf43A402d12b6a273",
      "deploymentSpec": {
        "deps": []
      }
    }
  },
  "C": {
    "name": "C",
    "contractName": "C",
    "args": [
      "A"
    ],
    "bytecode": "",
    "abi": [],
    "libraries": {},
    "txData": {
      "input": {
        "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "input": "0x608060405234801561001057600080fd5b506040516101db3803806101db8339818101604052602081101561003357600080fd5b810190808051906020019092919050505050610187806100546000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806319ff1d211461003b5780637254ef5b146100be575b600080fd5b610043610102565b6040518080602001828103825283818151815260200191508051906020019080838360005b83811015610083578082015181840152602081019050610068565b50505050905090810190601f1680156100b05780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6100ea600480360360208110156100d457600080fd5b810190808035906020019092919050505061013f565b60405180821515815260200191505060405180910390f35b60606040518060400160405280600581526020017f68656c6c6f000000000000000000000000000000000000000000000000000000815250905090565b6000816000819055506001905091905056fea2646970667358221220f3ff3ea901cd344ba38e8340d05ef92c9d2be7f7beeafaffbbc98e97eac7a28b64736f6c63430007030033"
      },
      "output": {
        "to": null,
        "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "contractAddress": "0xFD6D23eE2b6b136E34572fc80cbCd33E9787705e",
        "transactionIndex": 0,
        "gasUsed": {
          "type": "BigNumber",
          "hex": "0x021e0e"
        },
        "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "blockHash": "0xf3d7acc722a59a6594555bc9c329327a35d93ae5e55f9883399088d0a3fdffd4",
        "transactionHash": "0x37a9b6fc5dd53051e645bcb255719b0fd14676aa11fc4ceb137e7d650fa10ac7",
        "logs": [],
        "blockNumber": 341,
        "confirmations": 1,
        "cumulativeGasUsed": {
          "type": "BigNumber",
          "hex": "0x021e0e"
        },
        "status": 1,
        "byzantium": true
      }
    },
    "deployMetaData": {
      "logicallyDeployed": true,
      "contractAddress": "0xFD6D23eE2b6b136E34572fc80cbCd33E9787705e",
      "deploymentSpec": {
        "deps": []
      }
    }
  },
  "afterDeployBandC": {
    "event": {
      "name": "afterDeployBandC",
      "eventType": "AfterDeployEvent",
      "deps": [
        "B",
        "C"
      ]
    },
    "executed": true,
    "txData": {
      "A": {
        "contractInput": [
          {
            "functionName": "setExample",
            "inputs": [
              11
            ]
          }
        ],
        "contractOutput": [
          {
            "to": "0x74Df809b1dfC099E8cdBc98f6a8D1F5c2C3f66f8",
            "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "contractAddress": null,
            "transactionIndex": 0,
            "gasUsed": {
              "type": "BigNumber",
              "hex": "0xa234"
            },
            "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "blockHash": "0xb1b6cd704c1c8ebd6e65053d0c6b877d9b9dcc7ce370cb4089ebf931df0f6c31",
            "transactionHash": "0x47f39e896b0a052780e9b251a7a589a51d67cd533e738181437b6bdbdb2ca424",
            "logs": [],
            "blockNumber": 342,
            "confirmations": 1,
            "cumulativeGasUsed": {
              "type": "BigNumber",
              "hex": "0xa234"
            },
            "status": 1,
            "byzantium": true,
            "events": []
          }
        ]
      }
    }
  }
}
```
