import * as fs from 'fs';
import * as path from 'path';
import { cli } from 'cli-ux';
import { HardhatBuild } from '../types/migration';

const HARDHAT_CHAIN_ID_FILENAME = '.chainId';

export function parseSolFiles(sourcePath: string, contractNames: string[], result: string[]): string[] {
  const filenames = fs.readdirSync(sourcePath);

  filenames.forEach((name: string) => {
      if (fs.lstatSync(path.resolve(sourcePath, name)).isDirectory()) {
        return parseSolFiles(path.resolve(sourcePath, name), contractNames, result);
      }

      if (name.slice(name.length - 3, name.length) == 'sol') {
        const content = fs.readFileSync(path.resolve(sourcePath, name), 'utf-8');
        if (contractNames.length > 0) {
          result.push(content);
          return [];
        }

        if (new RegExp(contractNames.join('|')).test(content)) {
          result.push(content);
        }

        return [];
      }

      return result;
    }
  );

  return result;
}

export function parseFiles(sourcePath: string, contractNames: string[], result: string[]): string[] {
  const filenames = fs.readdirSync(sourcePath);

  filenames.forEach((fileName: string) => {
      if (fs.lstatSync(path.resolve(sourcePath, fileName)).isDirectory()) {
        return parseFiles(path.resolve(sourcePath, fileName), contractNames, result);
      }
      if (path.parse(fileName).ext != '.json') {
        return;
      }

      if (contractNames.length == 0) {
        const content = fs.readFileSync(path.resolve(sourcePath, fileName), 'utf-8');

        result.push(content);
        return [];
      }

      const actualFileName = path.parse(fileName).name;
      if (contractNames.includes(actualFileName)) {
        const content = fs.readFileSync(path.resolve(sourcePath, fileName), 'utf-8');

        result.push(content);
      }

      return result;
    }
  );

  return result;
}

export function searchBuilds(currentPath: string, results: any[]): object[] {
  const filenames = fs.readdirSync(currentPath);

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(currentPath, fileName)).isDirectory()) {
      return searchBuilds(path.resolve(currentPath, fileName), results);
    }
    if (path.parse(fileName).ext != '.json') {
      return;
    }

    const content = fs.readFileSync(path.resolve(currentPath, fileName), {encoding: 'utf-8'});
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

export function searchBuildsAndNetworks(currentPath: string, results: any[], chainId: string = undefined): object[] {
  const filenames = fs.readdirSync(currentPath);

  let newChainId = chainId;
  if (filenames.includes(HARDHAT_CHAIN_ID_FILENAME)) {
    newChainId = fs.readFileSync(path.resolve(currentPath, HARDHAT_CHAIN_ID_FILENAME), {encoding: 'utf-8'});
  }

  filenames.forEach((fileName: string) => {
    if (fs.lstatSync(path.resolve(currentPath, fileName)).isDirectory()) {
      return searchBuildsAndNetworks(path.resolve(currentPath, fileName), results, newChainId);
    }

    if (path.parse(fileName).ext != '.json') {
      return;
    }

    const content = fs.readFileSync(path.resolve(currentPath, fileName), {encoding: 'utf-8'});
    let jsonContent: HardhatBuild;
    try {
      jsonContent = JSON.parse(content) as HardhatBuild;
      jsonContent.networkId = newChainId;
      jsonContent.contractName = path.parse(fileName).name;
    } catch (e) {
      cli.error(e);

      return;
    }

    results.push(jsonContent);
  });

  return results;
}
