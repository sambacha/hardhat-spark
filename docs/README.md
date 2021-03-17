# Ignition

Solidity infrastructure as a code tool for easy deployment and management of smart contract infrastructure on Ethereum.

# Commands

| Commands                      | Glossary                                                              | Link                                        |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| Ignition Init                   | Initialize ignition config file and script.                             | [ignition init](./commands/init.md)           |
| Ignition Diff                   | Show difference between current and already deployed module.          | [ignition diff](./commands/diff.md)           |
| Ignition Deploy                 | Run/Continue deployment of the module.                                | [ignition deploy](./commands/deploy.md)       |
| Ignition GenTypes               | Generate custom module types on top of current module.                | [ignition genTypes](./commands/genTypes.md)   |
| Ignition Usage                  | Generate usage module, module made only for usage in other modules    | [ignition usage](./commands/usage.md)         |
| Ignition Migration              | Ability to migrate from other build/state files to ignition state file. | [ignition migration](./commands/migration.md) |
| Ignition Tutorial               | Step by step creation of simple deployment module with description.   | [ignition migration](./commands/migration.md) |

# Tutorials

| Tutorials     | Glossary                            | Link                                        |
| ------------- | ----------------------------------- | ------------------------------------------- |
| Basic         | Basic showcase of functionality.    | [basic](./tutorial/basic.md)                |
| Intermediate  | More complex functionality showcase | [intermediate](./tutorial/intermediate.md)  |
| Advanced      | Synthetix deployment module.        | [advanced](./tutorial/advanced.md)  |

# Concepts

| Concepts                      | Glossary                                        | Link        |
| ----------------------------- | ----------------------------------------------- | ----------- |
| Module Builder                | Interface for building contract infrastructure. | [module_builder](./concepts/module_builder/module_builder.md)                                        |
| Events                        | Event hooks for contract deployments.           | [events](./concepts/module_builder/events.md)                                                        |
| Contract Bindings             | Contract deployment abstraction.                | [contract_bindings](./concepts/module_builder/contract_binding.md)                                   |
| Module Deployment             | Module deployment overview.                     | [module_deployment](./concepts/module_deployment/module_deployment.md)                               |
| Module Dependencies resolving | Module dependencies resolving overview.         | [module_deps_resolver](./concepts/module_deps_resovler/module_deps_resolver.md)                      |
| Module Registry and resolver  | Deployment registry and deployment resolver.    | [module_registry_resolver](./concepts/module_registry_resolver/module_registry_resolver.md)          |
| Module State File             | Detailed data of deployment process.            | [module_state_file](./concepts/module_state_file/module_state_file.md)                               |
| Config                        | Ignition configuration options.                   | [config](./concepts/config.md)                                                                       |

# On-boarding - Migrations and external module usage

| On-boarding             | Link        |
| ----------------------- | ----------- |
| Migration process       | [migration-process](./on-boarding/migration.md)|
| Usage module generation | [usage-module-gen](./on-boarding/usage-module.md#usage-generation)|
| External module usage   | [usage-module-usage](./on-boarding/usage-module.md#usage-of-usage-module-in-other-projects)|

# Ported projects

| Projects          | Link        |
| ----------------- | ----------- |
| Synthetix port    | [synthetix module](../example/synthetix/deployment/module.ts)                |
| Tornado cash port | [tornado cash module](../example/tornado_core/deployment/tornado.module.ts)  |

# Developer UX

| Developer UX  | Glossary                                                           | Link                                      |
| ------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Expectancy    | Used as a easier way to expect contract read value.                | [expectancy](./ux/ux.md#Expectancy)       |
| Macros        | Way to wrap some custom deployment functionality for later reuse.  | [macros](./ux/ux.md#Macros)               |

# Testing

| Testing       | Glossary                                   | Link                                     |
| ------------- | ------------------------------------------ | ---------------------------------------- |
| Integration   | Integration test example and explanation.  | [test](./testing/integration/example.md) |

# Hardhat plugin

| Hardhat plugin      | Glossary                                                     | Link                                       |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| Setup               | How to setup hardhat config for ignition to work.            | [setup](./hardhat-plugin/hardhat-plugin.md)|
| Tasks               | Interface for running hardhat's ignition tasks.              | [tasks](./hardhat-plugin/tasks.md)|
| Extended environment| Surfaced all ignition functionality in hardhat environment.  | [extended_environment](./hardhat-plugin/extended_enviroment.md)|
