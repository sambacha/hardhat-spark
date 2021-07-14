import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Namespace } from "cls-hooked";
import { ethers } from "ethers";
import sinon, { StubbedInstance, stubInterface } from "ts-sinon";

import {
  buildModule,
  ContractBinding,
  ContractBindingMetaData,
  Deployed,
  DeployReturn,
  EthClient,
  EventTxExecutor,
  EventType,
  HardhatExtractor,
  ITransactionGenerator,
  MissingContractMetadata,
  ModuleAndModuleStateEventTypeMismatchError,
  ModuleBuilder,
  ModuleResolver,
  ModuleStateFile,
  StatefulEvent,
} from "../../src";
import { ModuleStateRepo } from "../../src/services/modules/states/repo/state-repo";
import { ModuleValidator } from "../../src/services/modules/validator/module-validator";
import { EmptyLogger } from "../../src/services/utils/logging/empty-logging";
chai.use(chaiAsPromised);

describe("resolve module", () => {
  let moduleResolver: ModuleResolver;
  const logger = new EmptyLogger();
  const stubRpcProvider: StubbedInstance<ethers.providers.JsonRpcProvider> = stubInterface<
    ethers.providers.JsonRpcProvider
  >();
  const stubSigner: StubbedInstance<ethers.Signer> = stubInterface<
    ethers.Signer
  >();
  const stubTransactionGenerator: StubbedInstance<ITransactionGenerator> = stubInterface<
    ITransactionGenerator
  >();
  const stubModuleStateRepo: StubbedInstance<ModuleStateRepo> = stubInterface<
    ModuleStateRepo
  >();
  const stubEventTransactionExecutor: StubbedInstance<EventTxExecutor> = stubInterface<
    EventTxExecutor
  >();
  const stubEventSession: StubbedInstance<Namespace> = stubInterface<
    Namespace
  >();
  const stubModuleSession: StubbedInstance<Namespace> = stubInterface<
    Namespace
  >();
  const stubEthClient: StubbedInstance<EthClient> = stubInterface<EthClient>();

  const stubExtractor: StubbedInstance<HardhatExtractor> = stubInterface<
    HardhatExtractor
  >();
  const stubModuleValidator: StubbedInstance<ModuleValidator> = stubInterface<
    ModuleValidator
  >();

  beforeEach(() => {
    moduleResolver = new ModuleResolver(
      stubRpcProvider,
      stubSigner,
      logger,
      stubTransactionGenerator,
      stubModuleStateRepo,
      stubEventTransactionExecutor,
      stubEventSession,
      stubEthClient
    );
  });
  afterEach(() => {
    sinon.restore();
  });

  it("should be able to resolve single contract", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.contract(contractName, 1, 2, 3);
    });

    stubExtractor.extractBytecode.returns({
      test: "0x0",
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
  });
  it("should be able to resolve multiple contracts", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const otherContractName = "otherTest";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.contract(contractName, 1, 2, 3);
      m.contract(otherContractName, 1, 2, 3);
    });

    stubExtractor.extractBytecode.returns({
      test: "0x0",
      otherTest: "0x0",
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
      otherTest: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
      otherTest: {},
    });

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.isDefined(moduleState[otherContractName]);
  });
  it("should be able to resolve single contract and single event", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const eventName = "afterDeployTest";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      const test = m.contract(contractName, 1, 2, 3);
      test.afterDeploy(m, eventName, async () => {});
    });

    stubExtractor.extractBytecode.returns({
      test: "0x0",
      otherTest: "0x0",
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
      otherTest: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
      otherTest: {},
    });
    stubModuleSession.get.returns(moduleName);

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.isDefined(moduleState[eventName]);

    const moduleArray = Object.entries(moduleState);
    assert.equal(moduleArray[0][1], moduleState[contractName]);
    assert.equal(moduleArray[1][1], moduleState[eventName]);
  });
  it("should be able to resolve multiple contracts and multiple events", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const otherContractName = "otherTest";
    const eventName = "afterDeployTest";
    const otherEventName = "afterDeployOtherTest";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      const test = m.contract(contractName, 1, 2, 3);
      const otherTest = m.contract(otherContractName, 1, 2, 3);
      test.afterDeploy(m, eventName, async () => {});
      otherTest.afterDeploy(m, otherEventName, async () => {});
    });

    stubExtractor.extractBytecode.returns({
      test: "0x0",
      otherTest: "0x0",
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
      otherTest: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
      otherTest: {},
    });
    stubModuleSession.get.returns(moduleName);

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.isDefined(moduleState[otherContractName]);
    assert.isDefined(moduleState[eventName]);
    assert.isDefined(moduleState[otherEventName]);
    const moduleArray = Object.entries(moduleState);
    assert.equal(moduleArray[0][1], moduleState[contractName]);
    assert.equal(moduleArray[1][1], moduleState[eventName]);
    assert.equal(moduleArray[2][1], moduleState[otherContractName]);
    assert.equal(moduleArray[3][1], moduleState[otherEventName]);
  });
  it("should be able to resolve custom deployFn", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const otherContractName = "otherTest";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      const test = m.contract(contractName);
      const otherTest = m.contract(otherContractName);
      otherTest.deployFn(async (): Promise<DeployReturn> => {
        const tx = await test.deployed().createChild();

        const children = await test.deployed().getChildren();

        return {
          transaction: tx,
          contractAddress: children[0],
        };
      }, test);
    });

    stubExtractor.extractBytecode.returns({
      test: "0x0",
      otherTest: "0x0",
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
      otherTest: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
      otherTest: {},
    });
    stubModuleSession.get.returns(moduleName);

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.isDefined(moduleState[otherContractName]);
  });

  it("should be able to resolve onStart module events", async () => {
    const moduleName = "testModule";
    const onStartEventName = "test";
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.onStart(onStartEventName, async () => {});
    });

    stubExtractor.extractBytecode.returns({});
    stubExtractor.extractContractInterface.returns({});
    stubExtractor.extractContractLibraries.returns({});
    stubModuleSession.get.returns(moduleName);

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[onStartEventName]);
  });
  it("should be able to resolve onCompletion module events", async () => {
    const moduleName = "testModule";
    const onCompletionEvent = "test";
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.onCompletion(onCompletionEvent, async () => {});
    });

    stubExtractor.extractBytecode.returns({});
    stubExtractor.extractContractInterface.returns({});
    stubExtractor.extractContractLibraries.returns({});
    stubModuleSession.get.returns(moduleName);

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[onCompletionEvent]);
  });
  it("should be able to resolve onSuccess module events", async () => {
    const moduleName = "testModule";
    const onSuccessEvent = "test";
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.onSuccess(onSuccessEvent, async () => {});
    });

    stubExtractor.extractBytecode.returns({});
    stubExtractor.extractContractInterface.returns({});
    stubExtractor.extractContractLibraries.returns({});
    stubModuleSession.get.returns(moduleName);

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[onSuccessEvent]);
  });

  describe("should be able to inject state file data in module object", () => {
    it("for contract", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const contractAbi = {
        inputs: [
          {
            internalType: "int256",
            name: "a",
            type: "int256",
          },
          {
            internalType: "uint256",
            name: "b",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "c",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      };
      const bytecode = "0x0";
      const deployedData: Deployed = {
        deploymentSpec: undefined,
        lastEventName: undefined,
        shouldRedeploy: undefined,
        logicallyDeployed: true,
        contractAddress: "0x0",
      };
      const contractStateData = new ContractBindingMetaData(
        contractName,
        contractName,
        [1, 2, 3],
        bytecode,
        contractAbi.inputs,
        false,
        {},
        undefined,
        deployedData
      );

      const stateFile: ModuleStateFile = {
        test: contractStateData,
      };
      const module = buildModule(moduleName, async (m: ModuleBuilder) => {
        m.contract(contractName, 1, 2, 3);
      });

      stubExtractor.extractBytecode.returns({
        test: bytecode,
      });
      stubExtractor.extractContractInterface.returns({
        test: [contractAbi],
      });
      stubExtractor.extractContractLibraries.returns({
        test: {},
      });
      stubEthClient.getCode.resolves("0x0");

      await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
        stubSigner,
      ]);

      const moduleState = await moduleResolver.resolve(
        module.getAllBindings(),
        module.getAllEvents(),
        module.getAllModuleEvents(),
        stateFile
      );

      assert.isDefined(moduleState);
      assert.isDefined(moduleState[contractName]);
      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .contractAddress,
        deployedData.contractAddress
      );
      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .logicallyDeployed,
        deployedData.logicallyDeployed
      );
    });
    it("for events", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const eventName = "afterDeployTest";
      const contractAbi = {
        inputs: [
          {
            internalType: "int256",
            name: "a",
            type: "int256",
          },
          {
            internalType: "uint256",
            name: "b",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "c",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      };
      const bytecode = "0x0";
      const deployedData: Deployed = {
        deploymentSpec: undefined,
        lastEventName: undefined,
        shouldRedeploy: undefined,
        logicallyDeployed: true,
        contractAddress: "0x0",
      };
      const contractStateData = new ContractBindingMetaData(
        contractName,
        contractName,
        [1, 2, 3],
        bytecode,
        contractAbi.inputs,
        false,
        {},
        undefined,
        deployedData
      );
      const statefulEvent = new StatefulEvent(
        {
          name: eventName,
          eventType: EventType.AFTER_DEPLOY_EVENT,
        },
        true,
        {}
      );

      const stateFile: ModuleStateFile = {
        test: contractStateData,
        afterDeployTest: statefulEvent,
      };
      const module = buildModule(moduleName, async (m: ModuleBuilder) => {
        const test = m.contract(contractName, 1, 2, 3);
        test.afterDeploy(m, eventName, async () => {});
      });

      stubExtractor.extractBytecode.returns({
        test: bytecode,
      });
      stubExtractor.extractContractInterface.returns({
        test: [contractAbi],
      });
      stubExtractor.extractContractLibraries.returns({
        test: {},
      });
      stubEthClient.getCode.resolves("0x0");

      await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
        stubSigner,
      ]);

      const moduleState = await moduleResolver.resolve(
        module.getAllBindings(),
        module.getAllEvents(),
        module.getAllModuleEvents(),
        stateFile
      );

      assert.isDefined(moduleState);
      assert.isDefined(moduleState[contractName]);
      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .contractAddress,
        deployedData.contractAddress
      );
      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .logicallyDeployed,
        deployedData.logicallyDeployed
      );
      assert.isDefined(moduleState[eventName]);
      assert.equal((moduleState[eventName] as StatefulEvent).executed, true);
    });
  });
  it("should be able to perform DI", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const bytecode = "0x0";

    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.contract(contractName, 1, 2, 3);
    });

    stubExtractor.extractBytecode.returns({
      test: bytecode,
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });
    stubEthClient.getCode.resolves("0x0");

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      {}
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.isDefined((moduleState[contractName] as ContractBinding).signer);
    assert.isDefined((moduleState[contractName] as ContractBinding).prompter);
    assert.isDefined(
      (moduleState[contractName] as ContractBinding).txGenerator
    );
    assert.isDefined(
      (moduleState[contractName] as ContractBinding).moduleStateRepo
    );
    assert.isDefined(
      (moduleState[contractName] as ContractBinding).eventTxExecutor
    );
    assert.isDefined(
      (moduleState[contractName] as ContractBinding).eventSession
    );
    assert.isDefined(
      (moduleState[contractName] as ContractBinding).moduleSession
    );
  });

  it("should be able to detect bytecode change", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const deployedBytecode = "0x00000000";
    const newBytecode = "0x00000001";
    const deployedData: Deployed = {
      deploymentSpec: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      logicallyDeployed: true,
      contractAddress: "0x0",
    };
    const contractStateData = new ContractBindingMetaData(
      contractName,
      contractName,
      [1, 2, 3],
      deployedBytecode,
      contractAbi.inputs,
      false,
      {},
      undefined,
      deployedData
    );

    const stateFile: ModuleStateFile = {
      test: contractStateData,
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.contract(contractName, 1, 2, 3);
    });

    stubExtractor.extractBytecode.returns({
      test: newBytecode,
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });
    stubEthClient.getCode.resolves("0x1");

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      stateFile
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.equal(
      (moduleState[contractName] as ContractBinding).bytecode,
      newBytecode
    );
  });
  it("should be able to detect force flag", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const deployedBytecode = "0x00000000";
    const newBytecode = "0x00000000";
    const deployedData: Deployed = {
      deploymentSpec: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      logicallyDeployed: true,
      contractAddress: "0x0",
    };
    const contractStateData = new ContractBindingMetaData(
      contractName,
      contractName,
      [1, 2, 3],
      deployedBytecode,
      contractAbi.inputs,
      false,
      {},
      undefined,
      deployedData
    );

    const stateFile: ModuleStateFile = {
      test: contractStateData,
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.contract(contractName, 1, 2, 3).force();
    });

    stubExtractor.extractBytecode.returns({
      test: newBytecode,
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });
    stubEthClient.getCode.resolves("0x1");

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      stateFile
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.equal(
      (moduleState[contractName] as ContractBinding).deployMetaData
        .contractAddress,
      undefined
    );
  });
  it("should be able to invalidate contract dependant if redeploy is occurring", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const eventName = "afterDeployTest";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const bytecode = "0x0";
    const deployedData: Deployed = {
      deploymentSpec: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      logicallyDeployed: true,
      contractAddress: "0x0",
    };
    const contractStateData = new ContractBindingMetaData(
      contractName,
      contractName,
      [1, 2, 3],
      bytecode,
      contractAbi.inputs,
      false,
      {},
      undefined,
      deployedData
    );
    const statefulEvent = new StatefulEvent(
      {
        name: eventName,
        eventType: EventType.AFTER_DEPLOY_EVENT,
      },
      true,
      {}
    );

    const stateFile: ModuleStateFile = {
      test: contractStateData,
      afterDeployTest: statefulEvent,
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      const test = m.contract(contractName, 1, 2, 3).force();
      test.afterDeploy(m, eventName, async () => {});
    });

    stubExtractor.extractBytecode.returns({
      test: bytecode,
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });
    stubEthClient.getCode.resolves("0x0");

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      stateFile
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.equal(
      (moduleState[contractName] as ContractBinding).deployMetaData
        .logicallyDeployed,
      undefined
    );
    assert.isDefined(moduleState[eventName]);
    assert.equal(
      (moduleState[eventName] as ContractBinding).deployMetaData
        ?.contractAddress,
      undefined
    );
    assert.equal((moduleState[eventName] as StatefulEvent).executed, false);
  });
  it("should be able to detect shouldRedeploy function", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const bytecode = "0x0";
    const deployedData: Deployed = {
      deploymentSpec: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      logicallyDeployed: true,
      contractAddress: "0x0",
    };
    const contractStateData = new ContractBindingMetaData(
      contractName,
      contractName,
      [1, 2, 3],
      bytecode,
      contractAbi.inputs,
      false,
      {},
      undefined,
      deployedData
    );

    const stateFile: ModuleStateFile = {
      test: contractStateData,
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.contract(contractName, 1, 2, 3).shouldRedeploy(
        (
          oldContract: ContractBindingMetaData,
          newContract: ContractBinding
        ): boolean => {
          assert.isDefined(oldContract);
          assert.equal(oldContract.deployMetaData.contractAddress, "0x0");
          assert.equal(oldContract.deployMetaData.logicallyDeployed, true);
          assert.equal(
            newContract.deployMetaData?.logicallyDeployed,
            undefined
          );
          assert.equal(newContract.deployMetaData?.contractAddress, undefined);
          return true;
        }
      );
    });

    stubExtractor.extractBytecode.returns({
      test: bytecode,
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });
    stubEthClient.getCode.resolves("0x0");

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      stateFile
    );

    assert.isDefined(moduleState);
    assert.isDefined(moduleState[contractName]);
    assert.equal(
      (moduleState[contractName] as ContractBinding).deployMetaData
        .logicallyDeployed,
      undefined
    );
    assert.equal(
      (moduleState[contractName] as ContractBinding).deployMetaData
        .contractAddress,
      undefined
    );
  });

  it("should fail if module has wrong contract name compared to the state file", async () => {
    const moduleName = "testModule";
    const otherContractName = "otherTest";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const bytecode = "0x0";

    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      m.contract(otherContractName, 1, 2, 3);
    });

    stubExtractor.extractBytecode.returns({
      test: bytecode,
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });
    stubEthClient.getCode.resolves("0x0");

    await expect(
      module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
        stubSigner,
      ])
    ).to.be.rejectedWith(MissingContractMetadata);
  });
  it("should fail if module has wrong event type compared to the state file", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const eventName = "afterDeployTest";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const bytecode = "0x0";
    const deployedData: Deployed = {
      deploymentSpec: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      logicallyDeployed: true,
      contractAddress: "0x0",
    };
    const contractStateData = new ContractBindingMetaData(
      contractName,
      contractName,
      [1, 2, 3],
      bytecode,
      contractAbi.inputs,
      false,
      {},
      undefined,
      deployedData
    );
    const statefulEvent = new StatefulEvent(
      {
        name: eventName,
        eventType: EventType.AFTER_DEPLOY_EVENT,
      },
      true,
      {}
    );

    const stateFile: ModuleStateFile = {
      test: contractStateData,
      afterDeployTest: statefulEvent,
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      const test = m.contract(contractName, 1, 2, 3);
      test.beforeDeploy(m, eventName, async () => {});
    });

    stubExtractor.extractBytecode.returns({
      test: bytecode,
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });
    stubEthClient.getCode.resolves("0x0");

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    await expect(
      moduleResolver.resolve(
        module.getAllBindings(),
        module.getAllEvents(),
        module.getAllModuleEvents(),
        stateFile
      )
    ).to.be.rejectedWith(ModuleAndModuleStateEventTypeMismatchError);
  });
  it("should be able to change event name and event should be able to resolve", async () => {
    const moduleName = "testModule";
    const contractName = "test";
    const eventName = "afterDeployTest";
    const otherEventName = "other-afterDeployTest";
    const contractAbi = {
      inputs: [
        {
          internalType: "int256",
          name: "a",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "b",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "c",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    };
    const bytecode = "0x0";
    const deployedData: Deployed = {
      deploymentSpec: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      logicallyDeployed: true,
      contractAddress: "0x0",
    };
    const contractStateData = new ContractBindingMetaData(
      contractName,
      contractName,
      [1, 2, 3],
      bytecode,
      contractAbi.inputs,
      false,
      {},
      undefined,
      deployedData
    );
    const statefulEvent = new StatefulEvent(
      {
        name: eventName,
        eventType: EventType.AFTER_DEPLOY_EVENT,
      },
      true,
      {}
    );

    const stateFile: ModuleStateFile = {
      test: contractStateData,
      afterDeployTest: statefulEvent,
    };
    const module = buildModule(moduleName, async (m: ModuleBuilder) => {
      const test = m.contract(contractName, 1, 2, 3);
      test.afterDeploy(m, otherEventName, async () => {});
    });

    stubExtractor.extractBytecode.returns({
      test: bytecode,
    });
    stubExtractor.extractContractInterface.returns({
      test: [contractAbi],
    });
    stubExtractor.extractContractLibraries.returns({
      test: {},
    });
    stubEthClient.getCode.resolves("0x0");

    await module.init(stubModuleSession, stubExtractor, stubModuleValidator, [
      stubSigner,
    ]);

    const moduleState = await moduleResolver.resolve(
      module.getAllBindings(),
      module.getAllEvents(),
      module.getAllModuleEvents(),
      stateFile
    );

    assert.isDefined(moduleState[otherEventName]);
    assert.equal(
      (moduleState[otherEventName] as StatefulEvent).executed,
      false
    );
    assert.equal(moduleState[eventName], undefined);
  });
});
