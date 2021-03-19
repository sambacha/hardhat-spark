# Introduction

## Current state of deployment tools

Instead of building on top of existing tooling, developers have to re-invent themselves every aspect of a
production-grade tooling from scratch. Standard deployment problems with common solutions are ultimately left as an
exercise for the reader:

- Managing multiple environments and their differences in deployment patterns/configuration.
- Keeping track of the deployment process with reusable retry mechanisms.
- Optimizing gas cost and transaction batching for efficient deployments (ETH and time-wise).
- Keeping track of deployed contracts over time.
- Providing hooks throughout the deployment process for running arbitrary maintenance/admin commands.
- Ensuring the deployments remain reproducible across environments (local, testnets, mainnet).
- Executing long-running deployments.

With the rapid success of DeFi, we're seeing more and more advanced deployment patterns, raising the bar for a what a
deployment system must be, effectively eliminating the possibility of leveraging existing tooling.

The result is a wide array of complex, brittle collection of deployment scripts, each trying to tackle the problem in
its own way, missing a great opportunity for a single focused effort solving smart contract deployment issues for
everyone.

## How is Ignition solving it?

**Ignition** is a batteries-included declarative deployment framework for Ethereum smart contracts. Ignition can easily
manage any smart contract project, regardless of its size or complexity, by utilizing smart dependency resolution and
flexible configuration management.

The initial inspiration for the project came by applying the Dependency Injection (DI) pattern, and the infrastructure
as code (IaC) approach of Terraform to the problem of smart contract deployments.

## Installation

```
npm i @tenderly/ignition -g
```

### Initial project setup

You will need to have hardhat and ignition installed in some project.

```
yarn add hardhat --dev
yarn add @tenderly/ignition --dev
```

Init hardhat and run hardhat node as a test environment in order to test deployment.

```
npx hardhat
```

```
npx hardhat node
```

Also make sure you have `ts-node` and `typescript` installed.

```
npm i ts-node
npm i typescript
```

# Tutorials

If you're a newcomer then this is place to be. The basic and intermediate tutorials are a hands-on way of understanding
how to use ignition. Not too much theory, just practical application to get you started

| Tutorials     | Glossary                            | Link                                        |
| ------------- | ----------------------------------- | ------------------------------------------- |
| Basic         | Basic showcase of functionality.    | [basic](./tutorial/basic.md)                |
| Intermediate  | More complex functionality showcase | [intermediate](./tutorial/intermediate.md)  |

# How-to guides

### On-boarding - Migrations and external module usage

| On-boarding             | Link        |
| ----------------------- | ----------- |
| Ignition tutorial       | [ignition-tutorial](./on-boarding/tutorial.md)|
| Migration process       | [migration-process](./on-boarding/migration.md)|
| Usage module            | [usage-module](./on-boarding/usage-module.md)|

### All usable commands

| Commands                      | Glossary                                                              | Link                                        |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| Mortar Init                   | Initialize mortar config file and script.                             | [mortar init](./commands/init.md)           |
| Mortar Diff                   | Show difference between current and already deployed module.          | [mortar diff](./commands/diff.md)           |
| Mortar Deploy                 | Run/Continue deployment of the module.                                | [mortar deploy](./commands/deploy.md)       |
| Mortar GenTypes               | Generate custom module types on top of current module.                | [mortar genTypes](./commands/genTypes.md)   |
| Mortar Usage                  | Generate usage module, module made only for usage in other modules    | [mortar usage](./commands/usage.md)         |
| Mortar Migration              | Ability to migrate from other build/state files to mortar state file. | [mortar migration](./commands/migration.md) |
| Mortar Tutorial               | Step by step creation of simple deployment module with description.   | [mortar tutorial](./commands/tutorial.md) |

### Developer UX

| Developer UX  | Glossary                                                           | Link                                      |
| ------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Expectancy    | Used as a easier way to expect contract read value.                | [expectancy](./ux/ux.md#Expectancy)       |
| Macros        | Way to wrap some custom deployment functionality for later reuse.  | [macros](./ux/ux.md#Macros)               |

### Ported projects

| Projects          | Link        |
| ----------------- | ----------- |
| Synthetix port    | [synthetix module](../example/synthetix/deployment/module.ts)                |
| Tornado cash port | [tornado cash module](../example/tornado_core/deployment/tornado.module.ts)  |

### Testing

| Testing       | Glossary                                   | Link                                     |
| ------------- | ------------------------------------------ | ---------------------------------------- |
| Integration   | Integration test example and explanation.  | [test](./testing/integration/example.md)

### Hardhat plugin

| Hardhat plugin      | Glossary                                                     | Link                                       |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| Setup               | How to setup hardhat config for ignition to work.            | [setup](./hardhat-plugin/hardhat-plugin.md)|
| Tasks               | Interface for running hardhat's ignition tasks.              | [tasks](./hardhat-plugin/tasks.md)|
| Extended environment| Surfaced all ignition functionality in hardhat environment.  | [extended_environment](./hardhat-plugin/extended_enviroment.md)|

# Concepts

| Concepts       | Glossary                                   | Link                                     |
| -------------- | ------------------------------------------ | ---------------------------------------- |
| Module Builder | Module builder is a class that is surfacing interface for module definition. | [module_builder](./concepts/module_builder/module_builder.md)
| Module Deployment | Explanation how deployment is executing. | [module_deployment](./concepts/module_deployment/module_deployment.md)
| Dependencies resolving | Detailed explanation how dependencies resolving is happening.| [module_deps_resolver](./concepts/module_deps_resolver/module_deps_resolver.md)
| Contracts resolver and registry | Concept of contract address registry and resolver. | [module_registry_resolver](./concepts/module_registry_resolver/module_registry_resolver.md)
| Module state file | What is state file and for what it is being used. | [module_state_file](./concepts/module_state_file/module_state_file.md)
| Config | Explanation of config structure and fields. | [config](./concepts/config.md)

# Contribution guideline

Ignition is built not to be standalone project with strict process of contributing. Anyone can submit feature proposal,
some improvements, bug fixes or anything else. Only limitation is that it needs to make sense, if it does than it can be
discussed, implemented and finally merged.

## Code structure

This is level 1 structure of the code.

```
├── commands
├── hardhat.ts
├── index.ts
├── interfaces
├── packages
└── usage_interfaces
```

`commands` - dir is sheltering all executable commands under ignition binary.

`hardhat.ts` - file that should be included when writing integration with a hardhat, either in script or in config file

`index.ts` - file is for surfacing ignition functionality to multiple usage_interface's

`usage_interfaces` - dir is covering all available ways that you can use ignition.

`packages` - dir is storing all business specific logic

`interfaces` - in this dir you can find all user-facing functionality for writing ignition deployment module

