export class UserError extends Error {
  public message: string;
  constructor(message: string) {
    super();
    this.message = 'User error - ' + message;
  }
}

export class CliError extends Error {
  public message: string;
  constructor(message: string) {
    super();
    this.message = 'CLI error - ' + message;
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

export class PrototypeNotFound extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export class StateIsBiggerThanModule extends UserError {
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
