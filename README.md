mortar-tenderly
===============

Solidity IaC deployment tool

[![Version](https://img.shields.io/npm/v/mortar-tenderly.svg)](https://npmjs.org/package/mortar-tenderly)
[![Downloads/week](https://img.shields.io/npm/dw/mortar-tenderly.svg)](https://npmjs.org/package/mortar-tenderly)
[![License](https://img.shields.io/npm/l/mortar-tenderly.svg)](https://github.com/Tenderly/mortar-tenderly/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @tenderly/mortar
$ mortar COMMAND
running command...
$ mortar (-v|--version|version)
@tenderly/mortar/0.0.0 darwin-x64 node-v10.21.0
$ mortar --help [COMMAND]
USAGE
  $ mortar COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mortar deploy [PATH]`](#mortar-deploy-path)
* [`mortar diff [PATH]`](#mortar-diff-path)
* [`mortar genTypes [PATH]`](#mortar-gentypes-path)
* [`mortar help [COMMAND]`](#mortar-help-command)
* [`mortar init`](#mortar-init)

## `mortar deploy [PATH]`

Deploy new migrations, difference between current and already deployed.

```
USAGE
  $ mortar deploy [PATH]

OPTIONS
  -h, --help                 show CLI help
  --debug                    Used for debugging purposes.
  --networkId=networkId      (required) Network ID of the network you are willing to deploy your contracts.
  --rpcProvider=rpcProvider  RPC Provider - URL of open RPC interface for your ethereum node.

  --state=state              Provide name of module's that you would want to use as state. Most commonly used if you are
                             deploying more than one module that are dependant on each other.

  --yes                      Used to skip confirmation questions.
```

_See code: [src/commands/deploy.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.0/src/commands/deploy.ts)_

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

## `mortar genTypes [PATH]`

describe the command here

```
USAGE
  $ mortar genTypes [PATH]

OPTIONS
  -h, --help  show CLI help
  --debug     Flag used for debugging
```

_See code: [src/commands/genTypes.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.0/src/commands/genTypes.ts)_

## `mortar help [COMMAND]`

display help for mortar

```
USAGE
  $ mortar help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_

## `mortar init`

Initialize mortar configuration file

```
USAGE
  $ mortar init

OPTIONS
  -h, --help               show CLI help
  --debug                  Flag used for debugging
  --networkId=networkId    (required) Network ID of the network you are willing to deploy your contracts
  --privateKey=privateKey  (required) Private Key of the deployer account
```

_See code: [src/commands/init.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.0/src/commands/init.ts)_
<!-- commandsstop -->
* [`mortar deploy`](#mortar-deploy-file)
* [`mortar diff`](#mortar-diff-file)

## `mortar deploy`

describe the command here

```
USAGE
  $ mortar deploy

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/deploy.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.0/src/commands/deploy.ts)_

## `mortar diff`

describe the command here

```
USAGE
  $ mortar diff

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/diff.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.0/src/commands/diff.ts)_
