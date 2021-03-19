# Module deployment

In other to showcase how deployment is done, lets take this module as an example
from [module dependencies resolver](../module_deps_resolver/module_deps_resolver.md).

![ModuleExample](../../images/module_example.png)

```
[
  ContractBinding(A), 
  ContractBinding(B), 
  ContractBinding(C), 
  StatefullEvent(afterDeployBandC)
]
```

## Streamlined

Ignition will go through array and execute every single element. This means that it will deploy contracts `A`, `B`
and `C` in above example, and it will execute an event. In case if there are any contract function execution it will
treat it as any other ethereum transaction execution, and it will wait for confirmation, but if there is contract call
and any variable read function it will not wait for confirmation.

For block confirmation we use this environment variable `BLOCK_CONFIRMATION_NUMBER` in order to be sure that transaction
is not replaced. Ignition is going to confirm if transaction is part of the block ignition, and it will continue with
execution. Just be sure not to execute any transaction's in mean time so ignition don't get confused about
current/next `nonce`.

## Parallelized

Parallelized deployment is separated in two main parts. First one is element batching, and second one is parallel
execution.

### Batching

Batching is poorly based on depth of the node in the dependency graph that is shown in the picture above. So this will
mean that first batch would have `ContractBinding(A)`, second batch would have `ContractBinding(B)`
and `ContractBinding(C)`, and third batch would have `StatefullEvent(afterDeployBandC)`.

```typescript
[
  [// batch 0
    ContractBinding(A)
  ],
  [// batch 1
    ContractBinding(B),
    ContractBinding(C)
  ],
  [// batch 2
    StatefullEvent(afterDeployBandC),
  ]
]
```

### Parallel execution

After batching is completed ignition will run every single batch in parallel, this will mean that it'll not wait for
block confirmation on transaction execution but rather after all transaction are sent to the pending pool. This way we
have lower deployment time by a rather significant amount.
