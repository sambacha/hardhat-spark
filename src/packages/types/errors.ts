class UserError extends Error{
  public message: string
  constructor(message: string) {
    super();
    this.message = "User error -" + message
  }
}

class CliError extends Error{
  public message: string
  constructor(message: string) {
    super();
    this.message = "CLI error -" + message
  }
}

class AbiMismatch extends UserError {
    constructor(message: string) {
    super(message);
  }
}

class BytecodeMismatch extends UserError {
  constructor(message: string) {
    super(message);
  }
}

class PathNotProvided extends UserError {
  constructor(message: string) {
    super(message);
  }
}

class NetworkIdNotProvided extends UserError {
  constructor(message: string) {
    super(message);
  }
}

class BindingsConflict extends UserError {
  constructor(message: string) {
    super(message);
  }
}

class StateIsBiggerThanModule extends UserError {
  constructor(message: string) {
    super(message);
  }
}

class ContractTypeMismatch extends UserError {
  constructor(message: string) {
    super(message);
  }
}

class PrivateKeyNotValid extends UserError {
  constructor(message: string) {
    super(message);
  }
}

class FailedToWriteToFile extends CliError {
  constructor(message: string) {
    super(message);
  }
}

class ContractTypeUnsupported extends UserError {
  constructor(message: string) {
    super(message);
  }
}
