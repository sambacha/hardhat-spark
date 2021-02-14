# Mortar

Solidity infrastructure as a code tool for easy deployment and management of smart contract infrastructure on Ethereum.

# Commands

| Commands                      | Glossary                                                      | Link                                      |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| Mortar Init                   | Initialize mortar config file and script.                     | [mortar init](./commands/init.md)         |
| Mortar Diff                   | Show difference between current and already deployed module.  | [mortar diff](./commands/diff.md)         |
| Mortar Deploy                 | Run/Continue deployment of the module.                        | [mortar deploy](./commands/deploy.md)     |
| Mortar GenTypes               | Generate custom module types on top of current module.        | [mortar genTypes](./commands/genTypes.md) |

# Concepts

| Concepts                      | Glossary    | Link        |
| ----------------------------- | ----------- | ----------- |
| Module Builder                | Interface for building contract infrastructure. | [module_builder](./concepts/module_builder/module_builder.md)                                        |
| Events                        | Event hooks for contract deployments.           | [events](./concepts/module_builder/events.md)                                                        |
| Contract Bindings             | Contract deployment abstraction.                | [contract_bindings](./concepts/module_builder/contract_binding.md)                                   |
| Module Deployment             | Module deployment overview.                     | [module_deployment](./concepts/module_deployment/module_deployment.md)                               |
| Module Dependencies resolving | Module dependencies resolving overview.         | [module_deps_resolver](./concepts/module_deps_resovler/module_deps_resolver.md)                      |
| Module Registry and resolver  | Deployment registry and deployment resolver.    | [module_registry_resolver](./concepts/module_registry_resolver/module_registry_resolver.md)          |
| Module State File             | Detailed data of deployment process.            | [module_state_file](./concepts/module_state_file/module_state_file.md)                               |
| Config                        | Mortar configuration options.                  | [config](./concepts/config.md)                                                                       |

# Usage

| Usage     | Glossary    | Link        |
| --------- | ----------- | ----------- |
| TODO          | TODO       | TODO       |

# Tutorials

| Tutorials | Glossary                          | Link                          |
| --------- | --------------------------------- | ----------------------------- |
| Basic     | Basic showcase of functionality.  | [basic](./tutorial/basic.md)  |
| Factory   | TODO       | TODO       |
| Proxy     | TODO       | TODO       |

# Developer UX

| Developer UX  | Glossary                                                           | Link                                      |
| ------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Expectancy    | Used as a easier way to expect contract read value.                | [expectancy](./ux/ux.md#Expectancy)       |
| Macros        | Way to wrap some custom deployment functionality for later reuse.  | [macros](./ux/ux.md#Macros)               |

# Testing

| Developer Ux  | Glossary    | Link        |
| ------------- | ----------- | ----------- |
| Integration   | TODO       | TODO       |
| Unit          | TODO       | TODO       |