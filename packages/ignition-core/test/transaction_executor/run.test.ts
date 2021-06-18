import { TransactionResponse } from "@ethersproject/abstract-provider";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Namespace } from "cls-hooked";
import { ethers } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import sinon, { StubbedInstance, stubInterface } from "ts-sinon";

import {
  ContractBinding,
  copyValue,
  Deployed,
  EventHandler,
  EventTxExecutor,
  ILogging,
  ITransactionGenerator,
  ModuleConfig,
  ModuleState,
  TxExecutor,
} from "../../src";
import { ModuleStateRepo } from "../../src/services/modules/states/repo/state_repo";
import { EmptyLogger } from "../../src/services/utils/logging/empty_logging";
chai.use(chaiAsPromised);

describe("transaction executor", () => {
  let txExecutor: TxExecutor;
  const logger = new EmptyLogger();
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
  const stubEventHandler: StubbedInstance<EventHandler> = stubInterface<
    EventHandler
  >();
  beforeEach(() => {
    txExecutor = new TxExecutor(
      stubLogger,
      stubModuleStateRepo,
      stubTransactionGenerator,
      networkId,
      stubRpcProvider,
      stubEventHandler,
      stubEventSession,
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
      stubModuleStateRepo,
      stubEventTransactionExecutor,
      stubEventSession
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
      stubModuleStateRepo,
      stubEventTransactionExecutor,
      stubEventSession
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
      stubModuleStateRepo,
      stubEventTransactionExecutor,
      stubEventSession
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
      stubModuleStateRepo,
      stubEventTransactionExecutor,
      stubEventSession
    );
    const moduleState: ModuleState = {
      test: contractStateData,
    };

    const transaction: StubbedInstance<TransactionResponse> = stubInterface<
      TransactionResponse
    >();
    stubRpcProvider.sendTransaction.resolves(transaction);

    await txExecutor.execute(moduleName, moduleState, undefined);

    // const constructorBytecode =
    //   bytecode +
    //   defaultAbiCoder
    //     .encode(["int256", "uint256", "uint256"], contractStateData.args)
    //     .substring(2);
    assert.equal(stubLogger.bindingExecution.calledWith(contractName), true);
    // @TODO bytecode is not correct in below function, check later
    assert.equal(stubTransactionGenerator.generateSingedTx.called, true);
    assert.equal(stubLogger.sendingTx.calledWith(contractName), true);
    assert.equal(transaction.wait.calledWith(1), true);
    assert.equal(stubLogger.sentTx.calledWith(contractName), true);
    assert.equal(
      stubLogger.finishedBindingExecution.calledWith(contractName),
      true
    );
    assert.equal(
      stubModuleStateRepo.storeSingleBinding.calledWith(contractStateData),
      true
    );
  });
  it("should be able to execute single event on top of single contract", () => {

  });
  it("should be able to logically deploy contract");

  it("should be able to create a correct batches of module elements");
  it(
    "should be able to execute multiple elements inside a batch in parallel manner"
  );

  it("should be able to execute module in sequential mode");
  it("should be able to execute module in parallel mode");
});
