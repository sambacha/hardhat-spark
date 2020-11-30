import * as fs from "fs";
import * as path from "path";

export function parseSolFiles(sourcePath: string, contractNames: string[], result: string[]): string[] {
  const filenames = fs.readdirSync(sourcePath)

  filenames.forEach((name) => {
      if (fs.lstatSync(path.resolve(sourcePath, name)).isDirectory()) {
        return parseSolFiles(path.resolve(sourcePath, name), contractNames, result)
      }

      if (name.slice(name.length - 3, name.length) == "sol") {
        const content = fs.readFileSync(path.resolve(sourcePath, name), 'utf-8')
        if (contractNames.length > 0) {
          result.push(content)
          return
        }

        if (new RegExp(contractNames.join("|")).test(content)) {
          result.push(content)
        }
      }
    }
  );

  return result
}

export function parseFiles(sourcePath: string, contractNames: string[], result: string[]): string[] {
  const filenames = fs.readdirSync(sourcePath)

  filenames.forEach((name) => {
      if (fs.lstatSync(path.resolve(sourcePath, name)).isDirectory()) {
        return parseFiles(path.resolve(sourcePath, name), contractNames, result)
      }

      if (contractNames.length == 0) {
        const content = fs.readFileSync(path.resolve(sourcePath, name), 'utf-8')

        result.push(content)
        return
      }

      if (contractNames.includes(name)) {
        const content = fs.readFileSync(path.resolve(sourcePath, name), 'utf-8')

        result.push(content)
      }
    }
  );

  return result
}
