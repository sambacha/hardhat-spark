import { assert } from 'chai';
import * as path from 'path';
import {
  CONFIG_SCRIPT_NAME,
  ContractBindingMetaData,
  DEPLOYMENT_FOLDER,
} from 'ignition-core';
import { IgnitionTests } from 'ignition-test';
import { loadStateFile } from '../utils/files';

const networkId = '31337'; // hardhat localhost chainId
const networkName = 'local'; // hardhat localhost chainId
const testPrivateKeys = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
];
const moduleName = 'ExampleModule';
const moduleFileName = 'module.ts';
const rootDir = process.cwd();

describe('ignition deploy', () => {
  const ignition = new IgnitionTests(
    {
      networkId: networkId,
      networkName: networkName,
      stateFileNames: [],
    },
    {
      privateKeys: testPrivateKeys,
      mnemonic: '',
      hdPath: '',
    }
  );
  afterEach(() => {
    ignition.cleanup();
    process.chdir(rootDir);
  });

  describe('ignition deploy - integration', () => {
    it('should be able to deploy module - single new binding', async () => {
      const projectFileName = 'single-new-binding';
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignition, moduleName);
      await runDeployCommand(ignition, projectLocation);

      const moduleStateFile = await ignition.getStateFile(moduleName);
      const contractBinding = (moduleStateFile[
        'Example'
      ] as unknown) as ContractBindingMetaData;
      assert.equal(!!contractBinding?.deployMetaData?.contractAddress, true);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
    });

    it('should be able to deploy module - multiple new bindings', async () => {
      const projectFileName = 'multiple-new-bindings';
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignition, moduleName);
      await runDeployCommand(ignition, projectLocation);

      const moduleStateFile = await ignition.getStateFile(moduleName);
      const firstContractBinding = (moduleStateFile[
        'Example'
      ] as unknown) as ContractBindingMetaData;
      const secondContractBinding = (moduleStateFile[
        'SecondExample'
      ] as unknown) as ContractBindingMetaData;

      assert.equal(
        !!firstContractBinding?.deployMetaData?.contractAddress,
        true
      );
      assert.equal(firstContractBinding.deployMetaData.logicallyDeployed, true);

      assert.equal(
        !!secondContractBinding?.deployMetaData?.contractAddress,
        true
      );
      assert.equal(
        secondContractBinding.deployMetaData.logicallyDeployed,
        true
      );
    });

    it('should be able to deploy module - single modified binding', async () => {
      const projectFileName = 'single-modified-binding';
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignition, moduleName);
      const moduleStateFileBefore = await ignition.getStateFile(moduleName);

      await runDeployCommand(ignition, projectLocation);
      const moduleStateFileAfter = await ignition.getStateFile(moduleName);

      const contractBindingBefore = (moduleStateFileBefore[
        'Example'
      ] as unknown) as ContractBindingMetaData;
      const contractBindingAfter = (moduleStateFileAfter[
        'Example'
      ] as unknown) as ContractBindingMetaData;
      assert.equal(
        contractBindingBefore.deployMetaData.contractAddress !=
          contractBindingAfter.deployMetaData.contractAddress,
        true
      );
      assert.equal(
        contractBindingBefore.deployMetaData.logicallyDeployed,
        true
      );
      assert.equal(contractBindingAfter.deployMetaData.logicallyDeployed, true);
    });

    it('should be able to deploy module - multiple modified binding', async () => {
      const projectFileName = 'multiple-modified-binding';
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignition, moduleName);
      const moduleStateFileBefore = await ignition.getStateFile(moduleName);

      await runDeployCommand(ignition, projectLocation);
      const moduleStateFileAfter = await ignition.getStateFile(moduleName);

      const firstContractBindingBefore = (moduleStateFileBefore[
        'Example'
      ] as unknown) as ContractBindingMetaData;
      const firstContractBindingAfter = (moduleStateFileAfter[
        'Example'
      ] as unknown) as ContractBindingMetaData;

      const secondContractBindingBefore = (moduleStateFileBefore[
        'SecondExample'
      ] as unknown) as ContractBindingMetaData;
      const secondContractBindingAfter = (moduleStateFileAfter[
        'SecondExample'
      ] as unknown) as ContractBindingMetaData;

      assert.equal(
        firstContractBindingBefore.deployMetaData.contractAddress !=
          firstContractBindingAfter.deployMetaData.contractAddress,
        true
      );
      assert.equal(
        firstContractBindingBefore.deployMetaData.logicallyDeployed,
        true
      );
      assert.equal(
        firstContractBindingAfter.deployMetaData.logicallyDeployed,
        true
      );

      assert.equal(
        secondContractBindingBefore.deployMetaData.contractAddress !=
          secondContractBindingAfter.deployMetaData.contractAddress,
        true
      );
      assert.equal(
        secondContractBindingBefore.deployMetaData.logicallyDeployed,
        true
      );
      assert.equal(
        secondContractBindingAfter.deployMetaData.logicallyDeployed,
        true
      );
    });

    it('should do nothing if their is no difference in modules', async () => {
      const projectFileName = 'no-difference-in-binding';
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignition, moduleName);
      const oldModuleStateFile = await ignition.getStateFile(moduleName);

      await runDeployCommand(ignition, projectLocation);

      const newModuleStateFile = await ignition.getStateFile(moduleName);

      const newContractBinding = (newModuleStateFile[
        'Example'
      ] as unknown) as ContractBindingMetaData;
      const oldContractBinding = (oldModuleStateFile[
        'Example'
      ] as unknown) as ContractBindingMetaData;
      assert.equal(
        newContractBinding.deployMetaData.contractAddress,
        oldContractBinding.deployMetaData.contractAddress
      );
      assert.equal(newContractBinding.deployMetaData.logicallyDeployed, true);
      assert.equal(oldContractBinding.deployMetaData.logicallyDeployed, true);
    });

    it('should do nothing if their is less bindings in modules compared to deployed one', async () => {
      const projectFileName = 'less-bindings';
      const projectLocation = path.resolve(
        rootDir,
        `./test/projects-scenarios/${projectFileName}`
      );
      process.chdir(projectLocation);
      await loadStateFile(projectLocation, ignition, moduleName);
      await runDeployCommand(ignition, projectLocation);

      const moduleStateFile = await ignition.getStateFile(moduleName);
      const contractBinding = (moduleStateFile[
        'Example'
      ] as unknown) as ContractBindingMetaData;
      assert.equal(!!contractBinding?.deployMetaData?.contractAddress, true);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
    });
  });

  describe('ignition deploy - examples - sync', () => {
    runExamples(ignition);
  });

  describe('ignition deploy - examples - parallel', () => {
    const ignitionParallelMode = new IgnitionTests(
      {
        networkId: networkId,
        networkName: networkName,
        stateFileNames: [],
      },
      {
        privateKeys: testPrivateKeys,
        mnemonic: '',
        hdPath: '',
        parallelizeDeployment: true,
      }
    );
    runExamples(ignitionParallelMode, true);
  });
});

async function runExamples(
  ignition: IgnitionTests,
  skipSynthethix: boolean = false
) {
  it('should be able to run - examples/all-feature-showcase', async () => {
    const projectFileName = 'all-feature-showcase';
    const projectLocation = path.resolve(
      rootDir,
      `../../example/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, 'module.ts');
  }).timeout(10000);

  it('should be able to run - examples/basic', async () => {
    const projectFileName = 'basic';
    const projectLocation = path.resolve(
      rootDir,
      `../../example/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, 'first.module.ts');
  });

  it('should be able to run - examples/dai-module', async () => {
    const projectFileName = 'dai-module';
    const projectLocation = path.resolve(
      rootDir,
      `../../example/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, 'module.ts');
  });

  it('should be able to run - examples/intermediate', async () => {
    const projectFileName = 'intermediate';
    const projectLocation = path.resolve(
      rootDir,
      `../../example/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, 'root.module.ts');
  });

  it('should be able to run - examples/migration', async () => {
    const projectFileName = 'migration';
    const projectLocation = path.resolve(
      rootDir,
      `../../example/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, 'tutorial.module.ts');
  }).timeout(10000);

  it('should be able to run - examples/patterns - factory', async () => {
    const projectFileName = 'patterns';
    const projectLocation = path.resolve(
      rootDir,
      `../../example/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, 'factory.module.ts');
  });

  it('should be able to run - examples/patterns - proxy', async () => {
    const projectFileName = 'patterns';
    const projectLocation = path.resolve(
      rootDir,
      `../../example/${projectFileName}`
    );
    process.chdir(projectLocation);
    await runDeployCommand(ignition, projectLocation, 'proxy.module.ts');
  });

  if (!skipSynthethix) {
    it('should be able to run - examples/synthetix', async () => {
      const projectFileName = 'synthetix';
      const projectLocation = path.resolve(
        rootDir,
        `../../example/${projectFileName}`
      );
      process.chdir(projectLocation);

      const { config: synthetixConfigFile } = require(path.resolve(
        projectLocation,
        CONFIG_SCRIPT_NAME
      ));
      await ignition.changeConfigFile(synthetixConfigFile);

      await runDeployCommand(ignition, projectLocation, 'module.ts');
    }).timeout(200000); // ~160s normal running time
  }

  it('should be able to run - examples/tornado_core', async () => {
    const projectFileName = 'tornado_core';
    const projectLocation = path.resolve(
      rootDir,
      `../../example/${projectFileName}`
    );
    process.chdir(projectLocation);

    const { config: configFile } = require(path.resolve(
      projectLocation,
      CONFIG_SCRIPT_NAME
    ));

    await ignition.changeConfigFile(configFile);

    await runDeployCommand(ignition, projectLocation, 'tornado.module.ts');
  }).timeout(10000);
}

async function runDeployCommand(
  ignition: IgnitionTests,
  projectLocation: string,
  projectFileName: string = moduleFileName
): Promise<void> {
  const deploymentFilePath = path.join(
    projectLocation,
    DEPLOYMENT_FOLDER,
    projectFileName
  );

  await ignition.deploy(deploymentFilePath);
}
