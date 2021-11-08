import * as fs from "fs";
import * as path from "path";
import { ILogObject, Logger } from "tslog";

import { EventType } from "../../../interfaces/hardhat-ignition";
import { ModuleContextMissingInLogger } from "../../types/errors";
import { ModuleState } from "../../types/module";
import { checkForFile, checkForFolder } from "../util";

import { generateErrorMessage, ILogging } from "./index";

const FOLDER_NAME = ".log";
const DEPLOYMENT_FOLDER = "deployment";

export class FileLogging implements ILogging {
  protected _moduleName: string | undefined;

  private _fullLogPath: string;
  private readonly _errorLogger: Logger;
  private readonly _logger: { [moduleName: string]: Logger };

  constructor() {
    this._logger = {};
    const timestamp = Math.trunc(new Date().getTime() / 1000);

    const currentDir = process.cwd();
    checkForFolder(path.resolve(currentDir, DEPLOYMENT_FOLDER, FOLDER_NAME));
    this._fullLogPath = path.resolve(
      currentDir,
      DEPLOYMENT_FOLDER,
      FOLDER_NAME,
      `/ignition.error.${timestamp}.log`
    );

    const logToTransport = (_logObject: ILogObject) => {
      checkForFile(this._fullLogPath);
      // @TODO
      // fs.appendFileSync(
      //   this._fullLogPath,
      //   `[${logObject.date.toTimeString()}] ${logObject.logLevel.toUpperCase()} ${
      //     logObject.argumentsArray[0]
      //   } ${JSON.stringify(logObject.argumentsArray.slice(1))} \n`
      // );
    };

    const logger: Logger = new Logger({
      type: "hidden",
    });
    logger.attachTransport(
      {
        silly: logToTransport,
        debug: logToTransport,
        trace: logToTransport,
        info: logToTransport,
        warn: logToTransport,
        error: logToTransport,
        fatal: logToTransport,
      },
      "debug"
    );
    this._errorLogger = logger;

    const dirPath = path.resolve(currentDir, DEPLOYMENT_FOLDER, FOLDER_NAME);
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(path.resolve(currentDir, DEPLOYMENT_FOLDER));
        fs.mkdirSync(dirPath);
      } catch (e) {}
    }
  }

  public alreadyDeployed(elementName: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("Element has already been deployed", {
      moduleName: this._moduleName,
      elementName,
    });
  }

  public bindingExecution(bindingName: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("Started contract binding execution", {
      moduleName: this._moduleName,
      bindingName,
    });
  }

  public logError(error: Error): void {
    const { message, stack } = generateErrorMessage(error);

    this._errorLogger.error("Error", {
      message,
      errorName: error.name,
      stack,
    });
  }

  public eventExecution(eventName: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("Started event execution", {
      moduleName: this._moduleName,
      eventName,
    });
  }

  public executeContractFunction(contractFunction: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("Executing contract function", {
      moduleName: this._moduleName,
      contractFunction,
    });
  }

  public executeWalletTransfer(address: string, to: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("Executing contract function", {
      moduleName: this._moduleName,
      address,
      to,
    });
  }

  public finishModuleDeploy(moduleName: string, _summary: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("finished module deployment", {
      moduleName,
    });
  }

  public finishedBindingExecution(bindingName: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info(
      "finished contract binding deployment",
      {
        moduleName: this._moduleName,
        bindingName,
      }
    );
  }

  public finishedEventExecution(eventName: string, eventType: EventType): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("finished event hook execution", {
      moduleName: this._moduleName,
      eventName,
      eventType,
    });
  }

  public finishedExecutionOfContractFunction(functionName: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info(
      "finished execution of contract function",
      {
        moduleName: this._moduleName,
        functionName,
      }
    );
  }

  public finishedExecutionOfWalletTransfer(from: string, to: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info(
      "finished execution of wallet transfer",
      {
        moduleName: this._moduleName,
        from,
        to,
      }
    );
  }

  public finishedModuleUsageGeneration(moduleName: string) {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("finished module usage generation", {
      moduleName,
    });
  }

  public gasPriceIsLarge(backoffTime: number) {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("gas price is to large", {
      moduleName: this._moduleName,
      backoffTime,
    });
  }

  public generatedTypes(): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("generated types");
  }

  public nothingToDeploy(): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("nothing to deploy", {
      moduleName: this._moduleName,
    });
  }

  public parallelizationExperimental() {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("running parallelization");
  }

  public promptContinueDeployment(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public promptExecuteTx(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public promptSignedTransaction(tx: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("singed tx", {
      moduleName: this._moduleName,
      signedTransaction: tx,
    });
  }

  public sendingTx(elementName: string, functionName: string = "CREATE"): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("sending transaction", {
      elementName,
      functionName,
    });
  }

  public sentTx(elementName: string, functionName: string = "CREATE"): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("sent transaction", {
      elementName,
      functionName,
    });
  }

  public startModuleDeploy(
    moduleName: string,
    _moduleStates: ModuleState
  ): void {
    const timestamp = Math.trunc(new Date().getTime() / 1000);

    const currentDir = process.cwd();
    this._fullLogPath = path.join(
      currentDir,
      DEPLOYMENT_FOLDER,
      FOLDER_NAME,
      `/ignition.${moduleName.toLowerCase()}.${timestamp}.log`
    );

    const logToTransport = (logObject: ILogObject) => {
      fs.appendFileSync(
        this._fullLogPath,
        `[${logObject.date.toTimeString()}] ${logObject.logLevel.toUpperCase()} ${
          logObject.argumentsArray[0]
        } ${JSON.stringify(logObject.argumentsArray.slice(1))} \n`
      );
    };

    const logger: Logger = new Logger({
      type: "hidden",
    });
    logger.attachTransport(
      {
        silly: logToTransport,
        debug: logToTransport,
        trace: logToTransport,
        info: logToTransport,
        warn: logToTransport,
        error: logToTransport,
        fatal: logToTransport,
      },
      "debug"
    );
    this._moduleName = moduleName;
    this._logger[this._moduleName] = logger;

    const dirPath = path.resolve(currentDir, DEPLOYMENT_FOLDER, FOLDER_NAME);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    this._logger[this._moduleName].info(
      "started module deployment",
      moduleName
    );
  }

  public startingModuleUsageGeneration(moduleName: string): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info(
      "started module usage generation",
      moduleName
    );
  }

  public transactionConfirmation(
    confirmationNumber: number,
    elementName: string,
    functionName: string = "CREATE"
  ): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("transaction confirmation", {
      confirmationNumber,
      elementName,
      functionName,
    });
  }

  public transactionReceipt(): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("received transaction receipt");
  }

  public waitTransactionConfirmation(): void {
    if (this._moduleName === undefined) {
      throw new ModuleContextMissingInLogger();
    }
    this._logger[this._moduleName].info("wait for transaction confirmation");
  }

  public wrongNetwork(): Promise<boolean> {
    this._errorLogger.error("Contracts are missing on the network.");

    return Promise.resolve(true);
  }

  public finishModuleResolving(_moduleName: string): void {}

  public startModuleResolving(_moduleName: string): void {}

  public contractFunctionAlreadyExecuted(
    _contractFunction: string,
    ..._args: any[]
  ): void {}
}
