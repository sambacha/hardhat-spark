import { CliError } from '../types/errors';
import * as path from 'path';

let cachedIsTypescriptSupported: boolean | undefined;

export function resolveConfigPath(configPath: string) {
  if (!path.isAbsolute(configPath)) {
    configPath = path.join(process.cwd(), configPath);
    configPath = path.normalize(configPath);
  }

  return configPath;
}

export function willRunWithTypescript(configPath?: string): boolean {
  const config = resolveConfigPath(configPath);
  return isTypescriptFile(config);
}

export function isRunningWithTypescript(pathToFile: string): boolean {
  return isTypescriptFile(pathToFile);
}

export function isTypescriptSupported() {
  if (cachedIsTypescriptSupported === undefined) {
    try {
      require.resolve('typescript');
      require.resolve('ts-node');
      cachedIsTypescriptSupported = true;
    } catch {
      cachedIsTypescriptSupported = false;
    }
  }

  return cachedIsTypescriptSupported;
}

export function loadTsNode(test?: boolean) {
  return;

  try {
    require.resolve('typescript');
  } catch (error) {
    throw new CliError('typescript is not installed.');
  }

  try {
    require.resolve('ts-node');
  } catch (error) {
    throw new CliError('ts-node is not installed.');
  }

  if (test) {
    require('ts-node/register/transpile-only');
    return;
  }

  if (process.env.TS_NODE_FILES === undefined) {
    process.env.TS_NODE_FILES = 'true';
  }

  require('ts-node/register');
}

function isTypescriptFile(path: string): boolean {
  return path.endsWith('.ts');
}

export async function loadScript(configScriptPath: string, test: boolean = false): Promise<any> {
  if (willRunWithTypescript(configScriptPath)) {
    loadTsNode(test);
  }

  let module;

  try {
    const imported = require(configScriptPath);
    module = imported.default !== undefined ? imported.default : imported;
  } catch (e) {
    console.log(e);
    module = {};
  }

  return module;
}
