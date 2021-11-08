import { cli } from "cli-ux";
import * as fs from "fs";

import { handleMappedErrorCodes } from "../types";

import { ILogging } from "./logging";

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function checkIfExist(object: any): boolean {
  return object !== undefined && typeof object !== "undefined";
}

export function checkIfSameInputs(
  input: {
    functionName: string;
    inputs: any[];
  },
  fragmentName: string,
  args: any[]
): boolean {
  return input.functionName === fragmentName && arrayEquals(input.inputs, args);
}

export function isSameBytecode(
  bytecodeOne: string,
  bytecodeTwo: string
): boolean {
  if (bytecodeOne === bytecodeTwo) {
    return true;
  }

  // https://docs.soliditylang.org/en/latest/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
  const metaDataLengthOne = parseInt(bytecodeOne.slice(-4), 16) * 2 + 4;
  const formattedBytecodeOne = bytecodeOne.substr(
    0,
    bytecodeOne.length - metaDataLengthOne
  );

  const metaDataLengthTwo = parseInt(bytecodeTwo.slice(-4), 16) * 2 + 4;
  const formattedBytecodeTwo = bytecodeTwo.slice(
    0,
    bytecodeTwo.length - metaDataLengthTwo
  );

  return formattedBytecodeOne === formattedBytecodeTwo;
}

export function arrayEquals(a: any[], b: any[]) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
}

export function removeLastPathElement(path: string) {
  const pathElements = path.split("/");
  pathElements.pop();
  return pathElements.join("/");
}

export async function checkMutex(
  mutex: boolean,
  delayTime: number,
  retries: number
) {
  if (retries === 0) {
    throw new Error("Maximum number of retries reached.");
  }

  if (mutex) {
    await delay(delayTime);
    await checkMutex(mutex, delayTime, retries - 1);
  }

  return;
}

export async function errorHandling(error: any, logger?: ILogging) {
  if (logger !== undefined) {
    logger.logError(error);

    return;
  }

  if (checkIfExist(error?.code)) {
    cli.info(handleMappedErrorCodes(error.code, error));
    if (cli.config.outputLevel === "debug" && error?.stack) {
      cli.debug(error?.stack);
    }

    throw error;
  }

  cli.info(error.message);
  if (cli.config.outputLevel === "debug" && error?.stack) {
    cli.debug(error.stack);
  }

  throw error;
}

export function copyValue(variableOne: any): any {
  return JSON.parse(JSON.stringify(variableOne));
}

export function checkForFolder(filePath: string) {
  fs.access(filePath, function (err) {
    if (err === undefined) {
      return;
    }

    fs.mkdirSync(filePath, { recursive: true });
  });
}

export function checkForFile(filePath: string) {
  try {
    fs.accessSync(filePath);
  } catch (e) {
    // @TODO fix later
    // fs.writeFileSync(filePath, "");
  }
}
