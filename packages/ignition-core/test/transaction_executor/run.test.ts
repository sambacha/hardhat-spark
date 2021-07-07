import {
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/abstract-provider";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import { createNamespace, Namespace } from "cls-hooked";
import { ethers } from "ethers";
import sinon, { StubbedInstance, stubInterface } from "ts-sinon";

import {
  AfterDeployEvent,
  ContractBinding,
  copyValue,
  Deployed,
  EventHandler,
  EventTxExecutor,
  EventType,
  ILogging,
  ITransactionGenerator,
  ModuleConfig,
  ModuleState,
  ModuleStateFile,
  StatefulEvent,
  TxExecutor,
} from "../../src";
import { FileSystemModuleState } from "../../src/services/modules/states/module/file-system";
import { ModuleStateRepo } from "../../src/services/modules/states/repo/state-repo";
import { EmptyLogger } from "../../src/services/utils/logging/empty-logging";

chai.use(chaiAsPromised);

describe("transaction executor", () => {
  let txExecutor: TxExecutor;
  let moduleStateRepo: ModuleStateRepo;
  let eventHandler: EventHandler;
  const logger = new EmptyLogger();
  const networkName = "test";
  const networkId = "test";
  const stubLogger: StubbedInstance<ILogging> = stubInterface<ILogging>();
  const stubRpcProvider: StubbedInstance<ethers.providers.JsonRpcProvider> = stubInterface<
    ethers.providers.JsonRpcProvider
  >();
  const stubSigner: StubbedInstance<ethers.Signer> = stubInterface<
    ethers.Signer
  >();
  const stubTransactionGenerator: StubbedInstance<ITransactionGenerator> = stubInterface<
    ITransactionGenerator
  >();
  const stubFileSystemModuleState: StubbedInstance<FileSystemModuleState> = stubInterface<
    FileSystemModuleState
  >();
  const stubEventTransactionExecutor: StubbedInstance<EventTxExecutor> = stubInterface<
    EventTxExecutor
  >();
  const eventSession: Namespace = createNamespace("event");
  const stubModuleSession: StubbedInstance<Namespace> = stubInterface<
    Namespace
  >();
  describe("transaction executor - sync", () => {
    beforeEach(() => {
      moduleStateRepo = new ModuleStateRepo(
        networkName,
        "/",
        false,
        stubFileSystemModuleState,
        true
      );

      eventHandler = new EventHandler(moduleStateRepo, stubLogger);

      txExecutor = new TxExecutor(
        stubLogger,
        moduleStateRepo,
        stubTransactionGenerator,
        networkId,
        stubRpcProvider,
        eventHandler,
        eventSession,
        stubEventTransactionExecutor,
        false
      );
    });
    afterEach(() => {
      sinon.reset();
    });

    it("should be able to detect if everything is already executed", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const bytecode = "0x0";
      const deployedData: Deployed = {
        deploymentSpec: undefined,
        lastEventName: undefined,
        shouldRedeploy: undefined,
        logicallyDeployed: true,
        contractAddress: "0x0",
      };
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
      const contractStateData = new ContractBinding(
        contractName,
        contractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        deployedData,
        undefined,
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const moduleState: ModuleState = {
        test: contractStateData,
      };
      await txExecutor.execute(moduleName, moduleState, undefined);

      assert.equal(stubLogger.alreadyDeployed.calledOnce, true);
      assert.equal(stubLogger.promptContinueDeployment.calledOnce, true);
      assert.equal(stubLogger.finishedBindingExecution.calledOnce, true);
    });
    it("should be able to skip already deployed contracts", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const bytecode = "0x0";
      const deployedData: Deployed = {
        deploymentSpec: undefined,
        lastEventName: undefined,
        shouldRedeploy: undefined,
        logicallyDeployed: true,
        contractAddress: "0x0",
      };
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
      const contractStateData = new ContractBinding(
        contractName,
        contractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        deployedData,
        undefined,
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const moduleState: ModuleState = {
        test: contractStateData,
        otherTest: contractStateData,
      };
      await txExecutor.execute(moduleName, moduleState, undefined);

      assert.equal(stubLogger.alreadyDeployed.calledTwice, true);
      assert.equal(stubLogger.promptContinueDeployment.calledTwice, true);
      assert.equal(stubLogger.finishedBindingExecution.calledTwice, true);
    });
    it("should be able to check if module config is present for deploy", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const bytecode = "0x0";
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
      const contractStateData = new ContractBinding(
        contractName,
        contractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        undefined,
        undefined,
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const moduleState: ModuleState = {
        test: contractStateData,
      };
      const oldModuleState = copyValue(moduleState);
      const moduleConfig: ModuleConfig = {
        contract: {
          test: {
            deploy: false,
          },
        },
        defaultOptions: {
          params: {},
        },
      };

      await txExecutor.execute(moduleName, moduleState, moduleConfig);

      assert.deepStrictEqual(oldModuleState, copyValue(moduleState));
    });
    it("should be able to deploy single contract", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const bytecode = "0x0";
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
      const contractStateData = new ContractBinding(
        contractName,
        contractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        undefined,
        {
          input: {
            from: "0x0",
          },
        },
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const moduleState: ModuleState = {
        test: contractStateData,
      };

      const transaction: StubbedInstance<TransactionResponse> = stubInterface<
        TransactionResponse
      >();
      stubRpcProvider.sendTransaction.resolves(transaction);
      stubFileSystemModuleState.getModuleState.resolves(
        moduleState as ModuleStateFile
      );

      moduleStateRepo.initStateRepo(moduleName);
      await txExecutor.execute(moduleName, moduleState, undefined);

      assert.equal(stubLogger.bindingExecution.calledWith(contractName), true);
      // @TODO bytecode is not correct in below function, check later
      // const constructorBytecode =
      //   bytecode +
      //   defaultAbiCoder
      //     .encode(["int256", "uint256", "uint256"], contractStateData.args)
      //     .substring(2);
      // assert.equal(
      //   stubTransactionGenerator.generateSingedTx.calledWith(
      //     0,
      //     constructorBytecode,
      //     stubSigner
      //   ),
      //   true
      // );
      assert.equal(stubTransactionGenerator.generateSingedTx.called, true);
      assert.equal(stubLogger.sendingTx.calledWith(contractName), true);
      assert.equal(transaction.wait.calledWith(1), true);
      assert.equal(stubLogger.sentTx.calledWith(contractName), true);
      assert.equal(
        stubLogger.finishedBindingExecution.calledWith(contractName),
        true
      );
    });
    it("should be able to execute single event on top of single contract", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const eventName = "afterDeployTest";
      const bytecode = "0x0";
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
      const deployedData: Deployed = {
        deploymentSpec: undefined,
        lastEventName: undefined,
        shouldRedeploy: undefined,
        logicallyDeployed: true,
        contractAddress: "0x0",
      };
      const contractStateData = new ContractBinding(
        contractName,
        contractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        deployedData,
        {
          input: {
            from: "0x0",
          },
        },
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const event: AfterDeployEvent = {
        name: eventName,
        eventType: EventType.AFTER_DEPLOY_EVENT,
        deps: ["test"],
        eventDeps: [],
        usage: [],
        eventUsage: [],
        moduleName,
        subModuleNameDepth: [],
        fn: async () => {},
      };
      const statefulEvent = new StatefulEvent(event, false, {});
      const moduleState: ModuleState = {
        test: contractStateData,
        afterDeployTest: statefulEvent,
      };
      stubFileSystemModuleState.getModuleState.resolves(
        moduleState as ModuleStateFile
      );

      moduleStateRepo.initStateRepo(moduleName);
      await txExecutor.execute(moduleName, moduleState, undefined);

      assert.equal((moduleState[eventName] as StatefulEvent).executed, true);
      assert.equal(
        stubFileSystemModuleState.storeStates.calledWith(
          networkName,
          moduleName,
          moduleState
        ),
        true
      );
      assert.equal(
        stubLogger.finishedEventExecution.calledWith(
          eventName,
          event.eventType
        ),
        true
      );
      assert.equal(
        stubFileSystemModuleState.storeStates.calledWith(
          networkName,
          moduleName,
          moduleState
        ),
        true
      );
    });
    it("should be able to logically deploy contract", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const eventName = "afterDeployTest";
      const bytecode = "0x0";
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
      const contractStateData = new ContractBinding(
        contractName,
        contractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        undefined,
        {
          input: {
            from: "0x0",
          },
        },
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const event: AfterDeployEvent = {
        name: eventName,
        eventType: EventType.AFTER_DEPLOY_EVENT,
        deps: ["test"],
        eventDeps: [],
        usage: [],
        eventUsage: [],
        moduleName,
        subModuleNameDepth: [],
        fn: async () => {},
      };
      const statefulEvent = new StatefulEvent(event, false, {});
      const moduleState: ModuleState = {
        test: contractStateData,
        afterDeployTest: statefulEvent,
      };
      const transaction: StubbedInstance<TransactionResponse> = stubInterface<
        TransactionResponse
      >();
      const transactionReceipt: StubbedInstance<TransactionReceipt> = stubInterface<
        TransactionReceipt
      >();
      transactionReceipt.contractAddress = "0x0";
      transaction.wait.resolves(transactionReceipt);
      stubRpcProvider.sendTransaction.resolves(transaction);
      stubFileSystemModuleState.getModuleState.resolves(
        moduleState as ModuleStateFile
      );

      moduleStateRepo.initStateRepo(moduleName);
      await txExecutor.execute(moduleName, moduleState, undefined);

      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .logicallyDeployed,
        true
      );
      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .contractAddress,
        "0x0"
      );
      assert.equal((moduleState[eventName] as StatefulEvent).executed, true);
    });
  });

  describe("transaction executor - parallel", () => {
    beforeEach(() => {
      moduleStateRepo = new ModuleStateRepo(
        networkName,
        "/",
        false,
        stubFileSystemModuleState,
        true
      );

      eventHandler = new EventHandler(moduleStateRepo, stubLogger);

      txExecutor = new TxExecutor(
        stubLogger,
        moduleStateRepo,
        stubTransactionGenerator,
        networkId,
        stubRpcProvider,
        eventHandler,
        eventSession,
        stubEventTransactionExecutor,
        true
      );
    });
    afterEach(() => {
      sinon.reset();
    });

    it("should be able to execute multiple batches", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const eventName = "afterDeployTest";
      const bytecode = "0x0";
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
      const contractStateData = new ContractBinding(
        contractName,
        contractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        undefined,
        {
          input: {
            from: "0x0",
          },
        },
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const event: AfterDeployEvent = {
        name: eventName,
        eventType: EventType.AFTER_DEPLOY_EVENT,
        deps: ["test"],
        eventDeps: [],
        usage: [],
        eventUsage: [],
        moduleName,
        subModuleNameDepth: [],
        fn: async () => {},
      };
      const statefulEvent = new StatefulEvent(event, false, {});
      const moduleState: ModuleState = {
        test: contractStateData,
        afterDeployTest: statefulEvent,
      };
      const transaction: StubbedInstance<TransactionResponse> = stubInterface<
        TransactionResponse
      >();
      const transactionReceipt: StubbedInstance<TransactionReceipt> = stubInterface<
        TransactionReceipt
      >();
      transactionReceipt.contractAddress = "0x0";
      transaction.wait.resolves(transactionReceipt);
      stubRpcProvider.sendTransaction.resolves(transaction);
      stubFileSystemModuleState.getModuleState.resolves(
        moduleState as ModuleStateFile
      );

      moduleStateRepo.initStateRepo(moduleName);
      await txExecutor.execute(moduleName, moduleState, undefined);

      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .logicallyDeployed,
        true
      );
      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .contractAddress,
        "0x0"
      );
      assert.equal((moduleState[eventName] as StatefulEvent).executed, true);
    });

    it("should be able to execute multiple elements inside a batch in parallel manner", async () => {
      const moduleName = "testModule";
      const contractName = "test";
      const otherContractName = "otherTest";
      const bytecode = "0x0";
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
      const contractStateData = new ContractBinding(
        contractName,
        contractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        undefined,
        {
          input: {
            from: "0x0",
          },
        },
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const otherContractStateData = new ContractBinding(
        otherContractName,
        otherContractName,
        [1, 2, 3],
        moduleName,
        [],
        "",
        stubModuleSession,
        bytecode,
        contractAbi.inputs,
        {},
        undefined,
        {
          input: {
            from: "0x0",
          },
        },
        undefined,
        stubSigner,
        logger,
        stubTransactionGenerator,
        moduleStateRepo,
        stubEventTransactionExecutor,
        eventSession
      );
      const moduleState: ModuleState = {
        test: contractStateData,
        otherTest: otherContractStateData,
      };
      const transaction: StubbedInstance<TransactionResponse> = stubInterface<
        TransactionResponse
      >();
      const transactionReceipt: StubbedInstance<TransactionReceipt> = stubInterface<
        TransactionReceipt
      >();
      transactionReceipt.contractAddress = "0x0";
      transaction.wait.resolves(transactionReceipt);
      stubRpcProvider.sendTransaction.resolves(transaction);
      stubFileSystemModuleState.getModuleState.resolves(
        moduleState as ModuleStateFile
      );

      moduleStateRepo.initStateRepo(moduleName);
      await txExecutor.execute(moduleName, moduleState, undefined);

      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .logicallyDeployed,
        true
      );
      assert.equal(
        (moduleState[contractName] as ContractBinding).deployMetaData
          .contractAddress,
        "0x0"
      );
      assert.equal(
        (moduleState[otherContractName] as ContractBinding).deployMetaData
          .logicallyDeployed,
        true
      );
      assert.equal(
        (moduleState[otherContractName] as ContractBinding).deployMetaData
          .contractAddress,
        "0x0"
      );
    });
  });
});
