// @ts-ignore
import { getStateIfExist, storeNewState } from '../utils/files';
import { assert } from 'chai';
import { MortarTests } from '../../src';
import * as path from 'path';
import { ContractBindingMetaData } from '../../src';

const networkId = 31337; // hardhat localhost chainId
const testPrivateKey = '0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0';
const moduleName = 'ExampleModule';
const rootDir = process.cwd();

describe('mortar deploy', () => {
  describe('mortar deploy - integration', () => {
    const mortar = new MortarTests(
      {
        networkId: networkId,
        stateFileNames: [],
      }, {
        privateKeys: [testPrivateKey],
        mnemonic: '',
        hdPath: '',
      });

    it('should be able to deploy module - single new binding', async () => {
      const projectFileName = 'single-new-binding';
      process.chdir(path.resolve(rootDir, `./test/projects-scenarios/${projectFileName}`));
      await loadStateFile(mortar, projectFileName);
      await runDeployCommand(mortar, projectFileName);

      const moduleStateFile = await mortar.getStateFile(moduleName);
      const contractBinding = moduleStateFile['Example'] as unknown as ContractBindingMetaData;
      assert.equal(contractBinding.deployMetaData.contractAddress.length > 0, true);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
      mortar.cleanup();
    });

    it('should be able to deploy module - multiple new bindings', async () => {
      const projectFileName = 'multiple-new-bindings';
      process.chdir(path.resolve(rootDir, `./test/projects-scenarios/${projectFileName}`));
      await loadStateFile(mortar, projectFileName);
      await runDeployCommand(mortar, projectFileName);

      const moduleStateFile = await mortar.getStateFile(moduleName);
      const firstContractBinding = moduleStateFile['Example'] as unknown as ContractBindingMetaData;
      const secondContractBinding = moduleStateFile['SecondExample'] as unknown as ContractBindingMetaData;

      assert.equal(firstContractBinding.deployMetaData.contractAddress.length > 0, true);
      assert.equal(firstContractBinding.deployMetaData.logicallyDeployed, true);

      assert.equal(secondContractBinding.deployMetaData.contractAddress.length > 0, true);
      assert.equal(secondContractBinding.deployMetaData.logicallyDeployed, true);

      mortar.cleanup();
    });

    it('should be able to deploy module - single modified binding', async () => {
      const projectFileName = 'single-modified-binding';
      process.chdir(path.resolve(rootDir, `./test/projects-scenarios/${projectFileName}`));
      await loadStateFile(mortar, projectFileName);
      const moduleStateFileBefore = await mortar.getStateFile(moduleName);

      const output = await runDeployCommand(mortar, projectFileName);
      const moduleStateFileAfter = await mortar.getStateFile(moduleName);


      const contractBindingBefore = moduleStateFileBefore['Example'] as unknown as ContractBindingMetaData;
      const contractBindingAfter = moduleStateFileAfter['Example'] as unknown as ContractBindingMetaData;
      assert.equal(
        contractBindingBefore.deployMetaData.contractAddress !=
        contractBindingAfter.deployMetaData.contractAddress
        , true);
      assert.equal(contractBindingBefore.deployMetaData.logicallyDeployed, true);
      assert.equal(contractBindingAfter.deployMetaData.logicallyDeployed, true);
      mortar.cleanup();
    });

    it('should be able to deploy module - multiple modified binding', async () => {
      const projectFileName = 'multiple-modified-binding';
      process.chdir(path.resolve(rootDir, `./test/projects-scenarios/${projectFileName}`));
      await loadStateFile(mortar, projectFileName);
      const moduleStateFileBefore = await mortar.getStateFile(moduleName);

      const output = await runDeployCommand(mortar, projectFileName);
      const moduleStateFileAfter = await mortar.getStateFile(moduleName);


      const firstContractBindingBefore = moduleStateFileBefore['Example'] as unknown as ContractBindingMetaData;
      const firstContractBindingAfter = moduleStateFileAfter['Example'] as unknown as ContractBindingMetaData;

      const secondContractBindingBefore = moduleStateFileBefore['SecondExample'] as unknown as ContractBindingMetaData;
      const secondContractBindingAfter = moduleStateFileAfter['SecondExample'] as unknown as ContractBindingMetaData;

      assert.equal(
        firstContractBindingBefore.deployMetaData.contractAddress !=
        firstContractBindingAfter.deployMetaData.contractAddress
        , true);
      assert.equal(firstContractBindingBefore.deployMetaData.logicallyDeployed, true);
      assert.equal(firstContractBindingAfter.deployMetaData.logicallyDeployed, true);

      assert.equal(
        secondContractBindingBefore.deployMetaData.contractAddress !=
        secondContractBindingAfter.deployMetaData.contractAddress
        , true);
      assert.equal(secondContractBindingBefore.deployMetaData.logicallyDeployed, true);
      assert.equal(secondContractBindingAfter.deployMetaData.logicallyDeployed, true);

      mortar.cleanup();
    });

    it('should do nothing if their is no difference in modules', async () => {
      const projectFileName = 'no-difference-in-binding';
      process.chdir(path.resolve(rootDir, `./test/projects-scenarios/${projectFileName}`));
      await loadStateFile(mortar, projectFileName);
      const oldModuleStateFile = await mortar.getStateFile(moduleName);

      await runDeployCommand(mortar, projectFileName);

      const newModuleStateFile = await mortar.getStateFile(moduleName);

      const newContractBinding = newModuleStateFile['Example'] as unknown as ContractBindingMetaData;
      const oldContractBinding = oldModuleStateFile['Example'] as unknown as ContractBindingMetaData;
      assert.equal(newContractBinding.deployMetaData.contractAddress, oldContractBinding.deployMetaData.contractAddress);
      assert.equal(newContractBinding.deployMetaData.logicallyDeployed, true);
      assert.equal(oldContractBinding.deployMetaData.logicallyDeployed, true);
      mortar.cleanup();
    });

    it('should do nothing if their is less bindings in modules compared to deployed one', async () => {
      const projectFileName = 'less-bindings';
      process.chdir(path.resolve(rootDir, `./test/projects-scenarios/${projectFileName}`));
      await loadStateFile(mortar, projectFileName);
      await runDeployCommand(mortar, projectFileName);

      const moduleStateFile = await mortar.getStateFile(moduleName);
      const contractBinding = moduleStateFile['Example'] as unknown as ContractBindingMetaData;
      assert.equal(contractBinding.deployMetaData.contractAddress.length > 0, true);
      assert.equal(contractBinding.deployMetaData.logicallyDeployed, true);
      mortar.cleanup();
    });
  });

  describe('module dependency resolve', () => {
    // @TODO implement couple more cases
  });
});

async function loadStateFile(mortar: MortarTests, projectFileName: string) {
  const stateFilePath = path.resolve(rootDir, `./test/projects-scenarios/${projectFileName}/.mortar/ExampleModule/${networkId}_deployed_module_state.json`);
  let stateFile;
  try {
    stateFile = require(stateFilePath);
  } catch (e) {
    stateFile = {};
  }
  mortar.setStateFile(moduleName, stateFile);
}

async function runDeployCommand(mortar: MortarTests, projectFileName: string): Promise<void> {
  const migrationPath = `./test/projects-scenarios/${projectFileName}/migrations/migration.ts`;

  await mortar.deploy(path.resolve(rootDir, migrationPath));
}
