import dotenv from "dotenv";
import * as path from "path";

dotenv.config({
  path: path.resolve(`${__dirname}../../../.env.local`),
});

let cachedIsTypescriptSupported: boolean | undefined;

export function resolveConfigPath(configPath: string) {
  if (!path.isAbsolute(configPath)) {
    configPath = path.join(process.cwd(), configPath);
    configPath = path.normalize(configPath);
  }

  return configPath;
}

export function willRunWithTypescript(configPath: string): boolean {
  const config = resolveConfigPath(configPath);
  return isTypescriptFile(config);
}

export function isRunningWithTypescript(pathToFile: string): boolean {
  return isTypescriptFile(pathToFile);
}

export function isTypescriptSupported() {
  if (cachedIsTypescriptSupported === undefined) {
    try {
      require.resolve("typescript");
      require.resolve("ts-node");
      cachedIsTypescriptSupported = true;
    } catch {
      cachedIsTypescriptSupported = false;
    }
  }

  return cachedIsTypescriptSupported;
}

export function loadTsNode(test?: boolean) {
  if (process.env.IGNITION_ENV === "development") {
    return;
  }

  try {
    require.resolve("typescript");
  } catch (error) {
    throw new Error("typescript is not installed.");
  }

  try {
    require.resolve("ts-node");
  } catch (error) {
    throw new Error("ts-node is not installed.");
  }

  if (test === true) {
    require("ts-node/register/transpile-only");
    return;
  }

  if (process.env.TS_NODE_FILES === undefined) {
    process.env.TS_NODE_FILES = "true";
  }

  require("ts-node/register");
}

function isTypescriptFile(filePath: string): boolean {
  return filePath.endsWith(".ts");
}

export async function loadScript(
  filePath: string,
  test: boolean = false
): Promise<any> {
  if (willRunWithTypescript(filePath)) {
    loadTsNode(test);
  }

  let file;

  try {
    if (test) {
      delete require.cache[require.resolve(filePath)];
    }
    const imported = require(filePath);
    file = imported.default !== undefined ? imported.default : imported;
  } catch (e) {
    throw e;
  }

  return file;
}
