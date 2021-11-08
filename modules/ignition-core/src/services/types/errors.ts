import { ParamType } from "@ethersproject/abi";
import chalk from "chalk";
import { ethers } from "ethers";
import * as path from "path";

const EVENT_HOOK_DEFINITION_DOCS_LINK =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";
const EVENT_LIFECYCLE_DOCS_LINK =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";
const CONTACT_DEFINITION_DOCS_LINK =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";
const MODULE_DEPENDENCIES_RESOLVING_DOCS_LINK =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";
const MODULE_GROUPING_DOCS_LINK =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";
const CONFIG_SCRIPT_DOCS =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";
const DEPLOYMENT_DOCS_LINK =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";
const MACRO_HELPER_DOCS =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";
const EVENT_HOOK_DEPS_DOCS_LINK =
  "https://github.com/nomiclabs/hardhat-ignition/tree/main/docs";

export enum ErrorCodes {
  NO_NETWORK = "NO_NETWORK",
}

export function handleMappedErrorCodes(
  errorCode: string,
  error: Error
): string {
  switch (errorCode) {
    case ethers.errors.NETWORK_ERROR:
    case ErrorCodes.NO_NETWORK: {
      return chalk.red(`No network running.
Seems like rpc provider is either down or unreachable.

In a case that want to run a local rpc node, execute $ npx hardhat node
`);
    }
    case ethers.errors.SERVER_ERROR: {
      return chalk.red(`${error.message}

If you are running a local rpc node you can check node logs for more error information`);
    }
    case ethers.errors.UNKNOWN_ERROR: {
      return error.message;
    }
    case ethers.errors.NOT_IMPLEMENTED:
    case ethers.errors.UNSUPPORTED_OPERATION:
    case ethers.errors.TIMEOUT:
    case ethers.errors.BUFFER_OVERRUN:
    case ethers.errors.NUMERIC_FAULT:
    case ethers.errors.MISSING_NEW:
    case ethers.errors.INVALID_ARGUMENT:
    case ethers.errors.MISSING_ARGUMENT:
    case ethers.errors.UNEXPECTED_ARGUMENT:
    case ethers.errors.CALL_EXCEPTION:
    case ethers.errors.INSUFFICIENT_FUNDS:
    case ethers.errors.NONCE_EXPIRED:
    case ethers.errors.REPLACEMENT_UNDERPRICED:
    case ethers.errors.UNPREDICTABLE_GAS_LIMIT: {
      return chalk.red(error.message);
    }
    default: {
      return chalk.red(error.message);
    }
  }
}

export class UserError extends Error {
  public _isUserError: boolean = true;
  public message: string;

  constructor(message: string) {
    super();
    this.message = message;
  }
}

export class CliError extends Error {
  public _isCliError: boolean = true;

  constructor(message: string) {
    super(message);
  }
}

export class ServicesNotInitialized extends UserError {
  constructor() {
    super(
      `Some services are not initialized inside the ignition.

This is internal issue, please open github issue if this happened to you.`
    );
  }
}

export class EmptySigners extends UserError {
  constructor() {
    super(
      `No signers provided.

No signers were provided in config nor in json rpc provider object.`
    );
  }
}

export class MissingToAddressInWalletTransferTransaction extends UserError {
  constructor() {
    super(
      `Missing to field in transaction object when trying to execute wallet transfer.`
    );
  }
}

export class ModuleIsAlreadyInitialized extends CliError {
  constructor() {
    super(`You are trying to use module that is already initialized`);
  }
}

export class CommandParsingFailed extends UserError {
  constructor(err: Error) {
    super(`Command failed to start. You have provided wrong command parameters.

${err}`);
  }
}

export class DeploymentFileError extends UserError {
  constructor(e: Error) {
    super(`Error inside deployment file:

${e.stack}
`);
  }
}

export class EventExecutionError extends UserError {
  constructor(eventName: string, e: Error) {
    super(`Error inside event hook ${eventName}

Error message: ${e.message}
${e.stack}
`);
  }
}

export class ContractNotCompiledError extends UserError {
  constructor(
    contractBindingName: string,
    contractName: string,
    moduleName: string
  ) {
    super(`Contract is not compiled correctly.
${chalk.bold("Library")} data is missing for ${chalk.bold(
      contractName
    )} contract inside module ${chalk.bold(moduleName)}.

Here is a more detailed explanation of a contract definition: ${CONTACT_DEFINITION_DOCS_LINK}`);
  }
}

export class WalletTransactionNotInEventError extends UserError {
  constructor() {
    super(`Cannot use sendTransaction() outside of a contract lifecycle event!

In order to execute a wallet transactions, you will need to use a contract lifecycle event. See the documentation for more information: ${EVENT_HOOK_DEFINITION_DOCS_LINK}`);
  }
}

export class EventDoesntExistError extends UserError {
  constructor(eventName: string) {
    super(`The event hook ${chalk.bold(eventName)} has not been defined yet.

This can occur if Ignition is using a contract event hook as a dependency before defining it in the module.
In order to better understand module dependency resolving, you can see the documentation here: ${MODULE_DEPENDENCIES_RESOLVING_DOCS_LINK}`);
  }
}

export class ContractNotDeployedError extends UserError {
  constructor(bindingName: string, contractName: string, eventName: string) {
    super(`Seems like the contract ${chalk.bold(
      contractName
    )} has not been deployed yet.

If you want to use this contract inside of the event hook ${chalk.bold(
      eventName
    )}, you can utilize ${chalk.bold(
      "m.group()"
    )} to specify it as a dependency.
Here is the link to the documentation: ${MODULE_GROUPING_DOCS_LINK}`);
  }
}

export class MissingAbiInContractError extends UserError {
  constructor(contractBindingName: string, contractName: string) {
    super(`Missing ABI data from contract binding of ${contractName} contract.

ABI data is missing from the compiled contract binding of ${chalk.bold(
      contractName
    )} contract.
Please check if everything is compiled correctly and if the artifact folder at ${chalk.italic(
      path.join(`artifacts/contracts`)
    )} exists.`);
  }
}

export class OneConfigAllowedError extends UserError {
  constructor(configScriptPath: string) {
    super(`Seems like you have multiple config objects in your config script at ${chalk.italic(
      path.join(configScriptPath)
    )}, try to merge them into a single object.

Here is the link to the documentation on how to define config script: ${CONFIG_SCRIPT_DOCS}`);
  }
}

export class ConfigScriptNotCompiledCorrectly extends UserError {
  constructor(error: Error, configScriptPath: string) {
    console.log(error);
    super(`Seems like there are compilation error for your script at ${chalk.italic(
      path.join(configScriptPath)
    )}.

If you are not sure how to write ignition config, here is detailed documentation: ${CONFIG_SCRIPT_DOCS}`);
  }
}

export class ConfigMissingError extends UserError {
  constructor(configScriptPath: string) {
    super(`Ignition config object is missing inside config script at ${chalk.italic(
      path.join(configScriptPath)
    )}.

If you are not sure how to write ignition config, here is detailed documentation: ${CONFIG_SCRIPT_DOCS}`);
  }
}

export class ModuleAndModuleStateMismatchElementError extends UserError {
  constructor(moduleElementName: string, stateFileModuleElementName: string) {
    super(`Seems like ${chalk.bold(
      moduleElementName
    )} is not the same type as ${chalk.bold(stateFileModuleElementName)}.

This can be caused if you have added a contract or an event in the middle of module dependency resolving.
Here is a link to the detailed description of the module resolving process: ${MODULE_DEPENDENCIES_RESOLVING_DOCS_LINK}`);
  }
}

export class ModuleAndModuleStateMismatchElementNameError extends UserError {
  constructor(moduleStateElementName: string, stateFileElementName: string) {
    super(`Module event hook name is different than one currently in state file for the same event hook.

Module file event name: ${chalk.bold(moduleStateElementName)}
State file event name: ${chalk.bold(stateFileElementName)}

In order for Ignition to resolve module dependencies correctly, this names should be the same.
Here is a link to the detailed description of the module resolving process, it can help you understand why this is the case: ${MODULE_DEPENDENCIES_RESOLVING_DOCS_LINK}
`);
  }
}

export class ModuleAndModuleStateEventTypeMismatchError extends UserError {
  constructor(
    currentEventName: string,
    resolvedModuleStateElementEventType: string,
    stateFileElementEventType: string
  ) {
    super(`You have changed the event hook type for the ${chalk.bold(
      currentEventName
    )} event, compared to the same event hook in the current state file.

Current event hook type: ${chalk.bold(resolvedModuleStateElementEventType)}
State file event hook type: ${chalk.bold(stateFileElementEventType)}

Learn more about defining and hooking events in ${EVENT_LIFECYCLE_DOCS_LINK}
`);
  }
}

export class NoDeploymentModuleError extends UserError {
  constructor() {
    super(`You will need to choose your deployment module in order to run Ignition.

Use --help for more information or consult documentation at the link here: ${DEPLOYMENT_DOCS_LINK}`);
  }
}

export class ShouldRedeployAlreadyDefinedError extends UserError {
  constructor(elementName: string) {
    super(`The contract ${elementName} already has the shouldRedeploy() functions defined.

You are only allowed to have a single shouldRedeploy() per contract.`);
  }
}

export class ArgumentLengthInvalid extends UserError {
  constructor(functionName: string, args: ParamType[]) {
    super(`
Trying to call a contract function with invalid number of arguments for the ${chalk.bold(
      functionName
    )}.

The function interface is looking like this:
${functionName}(${args.map((v: ParamType, index) => {
      if (index === arguments.length - 1) {
        return `${v.type}`;
      }

      return `${v.type}, `;
    })})`);
  }
}

export class EventNameExistsError extends UserError {
  constructor(eventName: string) {
    super(`The event hook ${chalk.bold(eventName)} is already defined.

Event names, when defining event hooks must be unique, check documentation for creation of event hooks: ${EVENT_HOOK_DEFINITION_DOCS_LINK}`);
  }
}

export class NoContractBindingDataInModuleState extends CliError {
  constructor(contractName: string, argName: string) {
    super(`Failed to initialize ${chalk.bold(
      contractName
    )}. Constructor parameter ${chalk.bold(
      argName
    )} has not yet been resolved by Ignition in the module resolving process.

Here is a link to the detailed description of the module resolving process: ${MODULE_DEPENDENCIES_RESOLVING_DOCS_LINK}
`);
  }
}

export class ModuleContextMissingInLogger extends CliError {
  constructor() {
    super(`Module name is missing in logger.`);
  }
}

export class UnexpectedValueError extends UserError {
  constructor(expected: any, actual: any) {
    super(`The validation of contract execution failed when checking expected value.

Expected value: ${chalk.bold(extractObjectInfo(expected))}
Actual value: ${chalk.bold(actual)}

Learn more about Ignition UX macro helpers here: ${MACRO_HELPER_DOCS}
`);
  }
}

export class GasPriceBackoffError extends UserError {
  constructor(
    maxGasPrice: string,
    currentGasPrice: string,
    numberOfRetries: number,
    backoffTime: number
  ) {
    super(`The current network gas price is ${chalk.bold(
      currentGasPrice
    )} wei and it's larger than expected max gas price ${chalk.bold(
      maxGasPrice
    )} wei.

Ignition will wait for ${chalk.bold(
      `${((numberOfRetries * backoffTime) / 1000).toString()}s`
    )} and check the network gas price again. Current total wait time is ${chalk.bold(
      `${((numberOfRetries * backoffTime) / 1000).toString()}s`
    )}.
`);
  }
}

// export class MissingDeploymentPath extends UserError {
//   constructor() {
//     super(`Deployment script path is missing.
// Either add it to hardhat-ignition.config.ts or use --help`);
//   }
// }

export class WrongDeploymentPathForNetwork extends UserError {
  constructor(filePath: string) {
    super(`Deployment file is not present at ${chalk.italic(
      path.join(filePath)
    )}.

If you are not sure how to define deployment file location in config script you can find more info here: ${CONFIG_SCRIPT_DOCS}
`);
  }
}

export class EventUsageIsNotDeployed extends UserError {
  constructor(currentEventName: string, eventUsage: string) {
    super(`The event ${chalk.bold(currentEventName)} is using ${chalk(
      eventUsage
    )} event, but the ${eventUsage} event still has ${chalk.bold(
      "not yet been executed"
    )}.

Learn more about event dependencies and usages here: ${EVENT_HOOK_DEPS_DOCS_LINK}
`);
  }
}

export class EventDependencyNotDeployedError extends UserError {
  constructor(eventName: string, dep: any) {
    super(`The event ${chalk.bold(eventName)} is depending on ${chalk(
      dep
    )} event, but the ${dep} event still has ${chalk.bold(
      "not yet been executed"
    )}.

Learn more about event dependencies and usages here: ${EVENT_HOOK_DEPS_DOCS_LINK}
`);
  }
}

export class ModuleStateMismatchError extends UserError {
  constructor(stateFileElementName: string, eventName: string) {
    super(`Seems like ${chalk.bold(
      eventName
    )} event is not the same type as the ${chalk.bold(
      stateFileElementName
    )} contract binding.

This can be caused if you have added a contract or an event in the middle of module dependency resolving.
Here is a link to the detailed description of the module resolving process: ${MODULE_DEPENDENCIES_RESOLVING_DOCS_LINK}
`);
  }
}

export class MissingContractMetadata extends UserError {
  constructor(contractName: string) {
    super(`Bytecode and libraries are mandatory to be specified inside artifacts file for ${chalk.bold(
      contractName
    )}.

Currently they are ${chalk.bold(
      "missing"
    )}, try to recompile them or manually fix the issue.
`);
  }
}

export class NoNetworkError extends UserError {
  constructor(error: Error, rpcProvider: string) {
    super(`Ignition could ${chalk.bold(
      "NOT DETECT"
    )} a running node at ${chalk.bold(rpcProvider)}.

Please check if node is running and if you have configured rpc correctly.
`);
  }
}

export class TransactionFailed extends UserError {
  constructor(message: string) {
    super(`Your transaction has reverted.

Error reason: ${message}`);
  }
}

export class ValueMismatch extends UserError {
  constructor(expected: any, actual: any) {
    super(`Failed on expectSlotRead() - could not match values:

expected value: ${expected}
actual value: ${actual}`);
  }
}

export class AbiMismatch extends UserError {
  constructor(name: string, abiLength: string, bindingArgsLength: string) {
    super(`Binding did not match number of arguments for contract - ${name}
  Expected ${abiLength} and got ${bindingArgsLength} number of arguments.`);
  }
}

export class PathNotProvided extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class NetworkIdNotProvided extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class BindingsConflict extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class TemplateNotFound extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class StateIsBiggerThanModule extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class ContractParameterIsMissing extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class ContractTypeMismatch extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class PrivateKeyNotValid extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class PrivateKeyIsMissing extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class MnemonicNotValid extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class FailedToWriteToFile extends CliError {
  constructor(message: string) {
    super(message);
  }
}

export class ContractTypeUnsupported extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class StateRegistryDialectNotSet extends CliError {
  constructor(message: string) {
    super(message);
  }
}

export class DeniedConfirmation extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class UsageBindingNotFound extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class UsageEventNotFound extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class MissingContractAddressInStateFile extends UserError {
  constructor(message: string) {
    super(message);
  }
}

function extractObjectInfo(obj: any): string {
  if (obj._isBigNumber) {
    return obj.toString();
  }

  if (obj._isContractBinding) {
    return `${obj.name}(${obj.deployMetaData.contractAddress})`;
  }

  if (obj._isContractBindingMetaData) {
    return obj.deployMetaData.contractAddress;
  }

  return "";
}
