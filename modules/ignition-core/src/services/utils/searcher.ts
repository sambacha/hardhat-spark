import { cli } from "cli-ux";
import fs from "fs";
import path from "path";

import { WrongDeploymentPathForNetwork } from "../types";
import { HardhatBuild } from "../types/migration";

const HARDHAT_CHAIN_ID_FILENAME = ".chainId";

export function searchModuleFilesName(
  currentPath: string,
  results: any[]
): string[] {
  if (!fs.existsSync(currentPath)) {
    throw new WrongDeploymentPathForNetwork(currentPath);
  }
  const filenames = fs.readdirSync(currentPath);

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(currentPath, fileName)).isDirectory()) {
      return searchModuleFilesName(
        path.resolve(currentPath, fileName),
        results
      );
    }
    if (
      !path.parse(fileName).base.includes("module") ||
      fileName.includes(".log")
    ) {
      return;
    }

    results.push(path.parse(fileName).base);
  });

  return results;
}

export function searchBuilds(currentPath: string, results: any[]): object[] {
  const filenames = fs.readdirSync(currentPath);

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(currentPath, fileName)).isDirectory()) {
      return searchBuilds(path.resolve(currentPath, fileName), results);
    }
    if (path.parse(fileName).ext !== ".json") {
      return;
    }

    const content = fs.readFileSync(path.resolve(currentPath, fileName), {
      encoding: "utf-8",
    });
    let jsonContent;
    try {
      jsonContent = JSON.parse(content);
    } catch (e) {
      cli.error(e);

      return;
    }

    results.push(jsonContent);
  });

  return results;
}

export function searchBuildsAndNetworks(
  currentPath: string,
  results: any[],
  chainId?: string | undefined
): object[] {
  const filenames = fs.readdirSync(currentPath);

  let newChainId = chainId;
  if (filenames.includes(HARDHAT_CHAIN_ID_FILENAME)) {
    newChainId = fs.readFileSync(
      path.resolve(currentPath, HARDHAT_CHAIN_ID_FILENAME),
      { encoding: "utf-8" }
    );
  }

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(currentPath, fileName)).isDirectory()) {
      return searchBuildsAndNetworks(
        path.resolve(currentPath, fileName),
        results,
        newChainId
      );
    }

    if (path.parse(fileName).ext !== ".json") {
      return;
    }

    const content = fs.readFileSync(path.resolve(currentPath, fileName), {
      encoding: "utf-8",
    });
    let jsonContent: HardhatBuild;
    try {
      jsonContent = JSON.parse(content) as HardhatBuild;
      jsonContent.contractName = path.parse(fileName).name;
    } catch (e) {
      cli.error(e);

      return;
    }

    results.push(jsonContent);
  });

  return results;
}
