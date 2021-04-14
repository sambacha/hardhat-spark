# Extending hardhat runtime environment with Ignition

## Writing scripts

Like any other hardhat plugin, hardhat-ignition is surfacing its functionality though HardhatRuntimeEnvironment.

```typescript
const modulePath = '<relative_path_to_deployment_dir>'
const ign = hre.hardhatIgnition as HardhatIgnition;

await ign.deploy(path.resolve(process.cwd(), modulePath), {
  moduleFilePath: modulePath,
  networkId: networkId
});
```

## Ignition interface

Every function is written to resemble hardhat command, so there are at most 2 arguments. One shall be full path to your
module deployment file, and other command arguments with `?` in interface if it is optional.

```typescript
export interface IIgnition {
  deploy(moduleFilePath: string, args: DeployArgs): Promise<void>;

  diff(moduleFilePath: string, args: DiffArgs): Promise<void>;

  genTypes(moduleFilePath: string, args: GenTypesArgs): Promise<void>;
  
  migration(args: MigrationArgs): Promise<void>;

  tutorial(args: TutorialArgs): Promise<void>;

  usage(moduleFilePath: string, args: UsageArgs): Promise<void>;
}
```

## Surfacing config file

Inside hardhat script you can also access hardhat-ignition config that you have provided inside `hardhat.config.ts`(or .js)
file.


```typescript
hre.config.ignition
```
