import { assert } from "chai";
import { Namespace } from "cls-hooked";
import { ethers } from "ethers";
import sinon, { StubbedInstance, stubInterface } from "ts-sinon";

import {
  buildModule,
  EthClient,
  EventTxExecutor,
  HardhatExtractor,
  ITransactionGenerator,
  ModuleBuilder,
  ModuleResolver,
} from "../../src";
import { ModuleStateRepo } from "../../src/services/modules/states/repo/state_repo";
import { ModuleValidator } from "../../src/services/modules/validator/module_validator";
import { EmptyLogger } from "../../src/services/utils/logging/empty_logging";

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
  it("should be able to resolve multiple contracts");
  it("should be able to resolve single contract and single event");
  it("should be able to resolve multiple contracts and multiple events");
  it("should be able to resolve custom deployFn");

  it("should be able to resolve onStart module events");
  it("should be able to resolve onCompletion module events");
  it("should be able to resolve onSuccess module events");
  it("should be able to resolve onError module events");

  describe("should be able to inject state file data in module object", () => {
    it("for contracts");
    it("for events");
  });
  describe("should be able to perform DI", () => {
    it("on ContractBindings");
    it("on StatefulEvent");
  });

  it("should be able to detect bytecode change");
  it("should be able to detect force flag");
  it(
    "should be able to invalidate contract dependant if redeploy is occurring"
  );
  it("should be able to detect shouldRedeploy function");

  it(
    "should fail if wrong order of elements is in state file compared to module object"
  );
  it(
    "should fail if module has wrong contract name compared to the state file"
  );
  it("should fail if module has wrong event type compared to the state file");
  it("should fail if module has wrong event name compared to the state file");
});
