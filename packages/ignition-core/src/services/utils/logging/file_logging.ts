import { generateErrorMessage, ILogging } from "./index";
import { ModuleState } from "../../modules/states/module";
import * as path from "path";
import * as fs from "fs";
import { DEPLOYMENT_FOLDER } from "../../tutorial/tutorial_service";
import { ILogObject, Logger } from "tslog";
import { EventType } from "../../../interfaces/hardhat_ignition";
import { ModuleContextMissingInLogger } from "../../types/errors";

const FOLDER_NAME = ".log";

export class FileLogging implements ILogging {
  private fullLogPath: string;
  private moduleName: string | undefined;
  private readonly errorLogger: Logger;
  private readonly logger: { [moduleName: string]: Logger };

  constructor() {
    this.logger = {};
    const timestamp = Math.trunc(new Date().getTime() / 1000);

    const currentDir = process.cwd();
    this.fullLogPath = path.join(
      currentDir,
      DEPLOYMENT_FOLDER,
      FOLDER_NAME,
      `/ignition.error.${timestamp}.log`
    );

    const logToTransport = (logObject: ILogObject) => {
      fs.appendFileSync(
        this.fullLogPath,
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
    this.errorLogger = logger;

    const dirPath = path.resolve(currentDir, DEPLOYMENT_FOLDER, FOLDER_NAME);
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(path.resolve(currentDir, DEPLOYMENT_FOLDER));
        fs.mkdirSync(dirPath);
      } catch (e) {}
    }
  }

  alreadyDeployed(elementName: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("Element has already been deployed", {
      moduleName: this.moduleName,
      elementName,
    });
  }

  bindingExecution(bindingName: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("Started contract binding execution", {
      moduleName: this.moduleName,
      bindingName,
    });
  }

  logError(error: Error): void {
    const { message, stack } = generateErrorMessage(error);

    this.errorLogger.error("Error", {
      message: message,
      errorName: error.name,
      stack: stack,
    });
  }

  eventExecution(eventName: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("Started event execution", {
      moduleName: this.moduleName,
      eventName,
    });
  }

  executeContractFunction(contractFunction: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("Executing contract function", {
      moduleName: this.moduleName,
      contractFunction,
    });
  }

  executeWalletTransfer(address: string, to: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("Executing contract function", {
      moduleName: this.moduleName,
      address,
      to,
    });
  }

  finishModuleDeploy(moduleName: string, summary: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("finished module deployment", {
      moduleName,
    });
  }

  finishedBindingExecution(bindingName: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("finished contract binding deployment", {
      moduleName: this.moduleName,
      bindingName,
    });
  }

  finishedEventExecution(eventName: string, eventType: EventType): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("finished event hook execution", {
      moduleName: this.moduleName,
      eventName,
      eventType,
    });
  }

  finishedExecutionOfContractFunction(functionName: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info(
      "finished execution of contract function",
      {
        moduleName: this.moduleName,
        functionName,
      }
    );
  }

  finishedExecutionOfWalletTransfer(from: string, to: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("finished execution of wallet transfer", {
      moduleName: this.moduleName,
      from,
      to,
    });
  }

  finishedModuleUsageGeneration(moduleName: string) {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("finished module usage generation", {
      moduleName,
    });
  }

  gasPriceIsLarge(backoffTime: number) {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("gas price is to large", {
      moduleName: this.moduleName,
      backoffTime,
    });
  }

  generatedTypes(): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("generated types");
  }

  nothingToDeploy(): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("nothing to deploy", {
      moduleName: this.moduleName,
    });
  }

  parallelizationExperimental() {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("running parallelization");
  }

  promptContinueDeployment(): Promise<void> {
    return Promise.resolve(undefined);
  }

  promptExecuteTx(): Promise<void> {
    return Promise.resolve(undefined);
  }

  promptSignedTransaction(tx: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("singed tx", {
      moduleName: this.moduleName,
      signedTransaction: tx,
    });
  }

  sendingTx(elementName: string, functionName: string = "CREATE"): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("sending transaction", {
      elementName,
      functionName: functionName,
    });
  }

  sentTx(elementName: string, functionName: string = "CREATE"): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("sent transaction", {
      elementName,
      functionName: functionName,
    });
  }

  startModuleDeploy(moduleName: string, moduleStates: ModuleState): void {
    const timestamp = Math.trunc(new Date().getTime() / 1000);

    const currentDir = process.cwd();
    this.fullLogPath = path.join(
      currentDir,
      DEPLOYMENT_FOLDER,
      FOLDER_NAME,
      `/ignition.${moduleName.toLowerCase()}.${timestamp}.log`
    );

    const logToTransport = (logObject: ILogObject) => {
      fs.appendFileSync(
        this.fullLogPath,
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
    this.moduleName = moduleName;
    this.logger[this.moduleName] = logger;

    const dirPath = path.resolve(currentDir, DEPLOYMENT_FOLDER, FOLDER_NAME);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    this.logger[this.moduleName].info("started module deployment", moduleName);
  }

  startingModuleUsageGeneration(moduleName: string): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info(
      "started module usage generation",
      moduleName
    );
  }

  transactionConfirmation(
    confirmationNumber: number,
    elementName: string,
    functionName: string = "CREATE"
  ): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("transaction confirmation", {
      confirmationNumber,
      elementName,
      functionName,
    });
  }

  transactionReceipt(): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("received transaction receipt");
  }

  waitTransactionConfirmation(): void {
    if (!this.moduleName) {
      throw new ModuleContextMissingInLogger();
    }
    this.logger[this.moduleName].info("wait for transaction confirmation");
  }

  wrongNetwork(): Promise<boolean> {
    this.errorLogger.error("Contracts are missing on the network.");

    return Promise.resolve(true);
  }

  finishModuleResolving(moduleName: string): void {}

  startModuleResolving(moduleName: string): void {}

  contractFunctionAlreadyExecuted(
    contractFunction: string,
    ...args: any[]
  ): void {}
}
