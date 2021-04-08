import chalk from 'chalk';

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
