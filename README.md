# Ignition

## Getting Started

### Overview

Hardhat Ignition is an Ethereum deployment system for structuring, automating and distributing smart contract deployment
setups. It helps developers clearly articulate and reliably execute the exact deployment result they're looking for.

The deployment definition is structured following a dependency injection pattern combined with an "infrastructure as
code" approach. This means that contract dependencies are explicitly specified for each contract, and a deployment setup
is code that describes initialization and relationships across your contracts.

When it comes to execution, Hardhat Ignition offers a series of features to facilitate and smooth out the often complex
process of contract deployment. This includes:

- Managing multiple deployment environments with different setups.
- Automated retry and resume mechanisms.
- Automated gas cost optimization, transaction batching and parallelization for cheaper and faster deployments by
  default.
- Tracking of deployed addresses.
- Availability of hooks throughout the deployment process for running arbitrary maintenance or initialization commands.

In combination, these features provide the infrastructure needed to confidently and reliably run deployment processes
that take a long time without needing to start from scratch somewhere during the process because something went wrong.

Hardhat Ignition is designed around the concepts of **contracts bindings** and **modules**. A contract binding is the
definition for how to instantiate a given contract. A module is a collection of bindings, and a module can contain other
modules. When you execute a deployment you're deploying a module.

Using Hardhat Ignition you can manage and structure the deployment of any Ethereum smart contract system, regardless of
its size or complexity.

### Installation

### Quick Start

```
npm i @tenderly/hardhat-ignition --dev
npm i ts-node typescript --dev
mkdir deployment/
```

`deployment/greeter.module.ts`:

```typescript
import { buildModule, ModuleBuilder } from '@tenderly/hardhat-ignition';

export const GreeterModule = buildModule('GreeterModule', async (m: ModuleBuilder) => {
  const Greeter = m.contract('Greeter', 'Hola mundo!');
});
```

`$ npx hardhat node`

`$ npx hardhat-ignition deploy`

# Documentation

Currently, only documentation is available here: [Docs](./docs/README.md)

# Team

Designed and built by [Tenderly](https://tenderly.co/)
