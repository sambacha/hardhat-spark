import chalk from 'chalk';
import { extractObjectInfo } from '../utils/util';

export class UserError extends Error {
  public _isUserError: boolean = true;
  public message: string;

  constructor(message: string) {
    super();
    this.message = 'User error - ' + message;
  }
}

export class CliError extends Error {
  public _isCliError: boolean = true;
  public message: string;

  constructor(message: string) {
    super();
    this.message = 'CLI error - ' + message;
  }
}

export class ContractNotCompiledError extends UserError {
  constructor(contractBindingName: string) {
    super(`Contract is not compiled correctly - ${contractBindingName}`);
  }
}

export class WalletTransactionNotInEventError extends UserError {
  constructor() {
    super('Wallet sendTransaction() function is running outside of an event!');
  }
}

export class EventDoesntExistError extends UserError {
  constructor(eventName: string) {
    super(`Event with this name doesn't exist - ${eventName}`);
  }
}

export class ContractNotDeployedError extends UserError {
  constructor(contractName: string) {
    super(`Contract is not suitable to be instantiated, please deploy it first - ${contractName}`);
  }
}

export class MissingAbiInContractError extends UserError {
  constructor(contractBindingName: string) {
    super(`Missing abi from binding - ${contractBindingName}`);
  }
}

export class OneConfigAllowedError extends UserError {
  constructor() {
    super('You can only have one config object!');
  }
}

export class ConfigMissingError extends UserError {
  constructor() {
    super('Config object is missing. This can be caused either if hardhat-ignition.config.ts file is missing or it didnt compile correctly');
  }
}

export class ModuleAndModuleStateMismatchElementError extends UserError {
  constructor() {
    super("Module and module state file didn't match element.");
  }
}

export class ModuleAndModuleStateMismatchElementNameError extends UserError {
  constructor(moduleStateElementName: string, stateFileElementName: string) {
    super(`Module and module state file didn't match state element name:
Module file: ${moduleStateElementName}
State file: ${stateFileElementName}`);
  }
}

export class ModuleAndModuleStateEventTypeMismatchError extends UserError {
  constructor(resolvedModuleStateElementEventType, stateFileElementEventType) {
    super(`Module and module state file didn't match state element event type:
Module file: ${resolvedModuleStateElementEventType}
State file: ${stateFileElementEventType}`);
  }
}

export class NoDeploymentModuleError extends UserError {
  constructor() {
    super('Their is not deployment module provided.\n   Use --help for more information.');
  }
}

export class ShouldRedeployAlreadyDefinedError extends UserError {
  constructor() {
    super('shouldRedeploy() function is already defined for this contract.');
  }
}

export class ArgumentLengthInvalid extends UserError {
  constructor(functionName: string) {
    super(`Trying to call contract function with more/less arguments - ${functionName}`);
  }
}

export class EventNameExistsError extends UserError {
  constructor(eventName: string) {
    super(`Event with same name already initialized - ${eventName}`);
  }
}

export class NoContractBindingDataInModuleState extends CliError {
  constructor(name: string) {
    super(`Their is no data of this contract binding in resolved module state - ${name}`);
  }
}

export class UnexpectedValueError extends UserError {
  constructor(expected: any, actual: any) {
    super(`Failed on expectFuncRead - couldn't match
expected value: ${extractObjectInfo(expected)}
actual value: ${actual}`);
  }
}

export class GasPriceBackoffError extends UserError {
  constructor(maxGasPrice: string, currentGasPrice: string, numberOfRetries: number, backoffTime: number) {
    super(`Current network gas price is too large
Max gas price: ${maxGasPrice} wei
Current gas price: ${currentGasPrice} wei
Total wait time: ${(numberOfRetries * backoffTime) / 1000} s
`);
  }
}

export class MissingDeploymentPath extends UserError {
  constructor() {
    super(`Deployment script path is missing.
Either add it to hardhat-ignition.config.ts or use --help`);
  }
}

export class WrongDeploymentPathForNetwork extends UserError {
  constructor(networkName: string) {
    super(`Provided deployment script path is wrong for ${networkName}.
Either add it to hardhat-ignition.config.ts or use --help`);
  }
}

export class EventUsageIsNotDeployed extends UserError {
  constructor(eventUsage: any) {
    super(`Event usage is not yet deployed - ${eventUsage}`);
  }
}

export class EventDependencyNotDeployedError extends UserError {
  constructor(eventName: string, dep: any) {
    super(`Dependency is not yet deployed \nEvent: ${eventName} \nDependency: ${dep}`);
  }
}

export class ModuleStateMismatchError extends UserError {
  constructor(eventName: string) {
    super(`Module and module state file didn't match state element name:
Module file: ${eventName}`);
  }
}

export class MissingContractMetadata extends UserError {
  constructor(contractName: string) {
    super(`Contract metadata are missing for ${chalk.bold(contractName)}`);
  }
}

export class NoNetworkError extends UserError {
  constructor() {
    super(`Ignition could detect network.`);
  }
}

export class TransactionFailed extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class WrongNetwork extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class ValueMismatch extends UserError {
  constructor(message: string, expected: any, actual: any) {
    super(`${message}
expected value: ${expected}
actual value: ${actual}`);
  }
}

export class IgnitionConfigAlreadyExist extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class AbiMismatch extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class BytecodeMismatch extends UserError {
  constructor(message: string) {
    super(message);
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
