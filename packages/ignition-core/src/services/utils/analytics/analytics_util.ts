import type envPathsT from "env-paths";
import fs from "fs-extra";
import * as path from "path";

function generatePathsSync(packageName = "hardhat") {
  const envPaths: typeof envPathsT = require("env-paths");
  return envPaths(packageName);
}

async function generatePaths(packageName = "hardhat") {
  const { default: envPaths } = await import("env-paths");
  return envPaths(packageName);
}

async function getDataDir(packageName?: string): Promise<string> {
  const { data } = await generatePaths(packageName);
  await fs.ensureDir(data);
  return data;
}

async function readId(idFile: string): Promise<string | undefined> {
  let clientId: string;
  try {
    const data = await fs.readJSON(idFile, { encoding: "utf8" });
    clientId = data.analytics.clientId;
  } catch (error) {
    return undefined;
  }

  return clientId;
}

export async function readAnalyticsId(): Promise<string | undefined> {
  const globalDataDir = await getDataDir();
  const idFile = path.join(globalDataDir, "analytics.json");
  return readId(idFile);
}
