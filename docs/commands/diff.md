## `mortar diff [PATH]`

Difference between deployed and current migrations.

```
USAGE
  $ mortar diff [PATH]

OPTIONS
  -h, --help             show CLI help
  --debug                Flag used for debugging
  --networkId=networkId  (required) Network ID of the network you are willing to deploy your contracts.

  --state=state          Provide name of module's that you would want to use as states. Most commonly used if you are
                         deploying more than one module that are dependant on each other.
```

_See code: [src/commands/diff.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.0/src/commands/diff.ts)_
