mortar-tenderly
===============

Solidity IaC deployment tool

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
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
$ npm install -g mortar-tenderly
$ mortar COMMAND
running command...
$ mortar (-v|--version|version)
mortar-tenderly/0.0.0 darwin-x64 node-v10.21.0
$ mortar --help [COMMAND]
USAGE
  $ mortar COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mortar hello [FILE]`](#mortar-hello-file)
* [`mortar help [COMMAND]`](#mortar-help-command)

## `mortar hello [FILE]`

describe the command here

```
USAGE
  $ mortar hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ mortar hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/Tenderly/mortar-tenderly/blob/v0.0.0/src/commands/hello.ts)_

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
<!-- commandsstop -->
