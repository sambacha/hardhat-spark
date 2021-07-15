import { FunctionFragment } from "@ethersproject/abi";
import {
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "@ethersproject/abstract-provider";
import { ContractFunction } from "@ethersproject/contracts";
import { Deferrable } from "@ethersproject/properties";
import { cli } from "cli-ux";
import { Namespace } from "cls-hooked";
import { CallOverrides, ethers } from "ethers";

import { IContractDataExtractor } from "../services/ethereum/extractor";
import { IGasCalculator, IGasPriceCalculator } from "../services/ethereum/gas";
import {
  INonceManager,
  ITransactionGenerator,
  ITransactionSigner,
} from "../services/ethereum/transactions";
import { EventTxExecutor } from "../services/ethereum/transactions/event-executor";
import { IModuleStateRepo } from "../services/modules/states/repo";
import { IModuleValidator } from "../services/modules/validator";
import {
  JsonFragment,
  JsonFragmentType,
} from "../services/types/artifacts/abi";
import {
  LinkReferences,
  SingleContractLinkReference,
} from "../services/types/artifacts/libraries";
import {
  ArgumentLengthInvalid,
  BindingsConflict,
  CliError,
  ContractNotDeployedError,
  DeploymentFileError,
  EventDoesntExistError,
  EventNameExistsError,
  MissingContractMetadata,
  MissingToAddressInWalletTransferTransaction,
  ModuleIsAlreadyInitialized,
  ShouldRedeployAlreadyDefinedError,
  TemplateNotFound,
  WalletTransactionNotInEventError,
} from "../services/types/errors";
import { ClsNamespaces } from "../services/utils/continuation-local-storage";
import { ILogging } from "../services/utils/logging";
import {
  checkIfExist,
  checkIfSameInputs,
  copyValue,
  isSameBytecode,
} from "../services/utils/util";

export type AutoBinding = any | Binding | ContractBinding;

// Argument can be either an AutoBinding or a NamedArgument.
// In case of variadic arguments, the expected type is always
// an AutoBinding, and in the case of named arguments we expect
// exactly one NamedArgument.
//
// Nonetheless, the argument parsing system should account for all possible
// combinations and either intelligently process them or fail with a
// clear error and the action needed to resolve it.
export type Argument = AutoBinding | NamedArguments;

// NamedArguments are a mapping of argument names to AutoBindings
// to be used when resolving Bindings and Actions.
export interface NamedArguments {
  [name: string]: AutoBinding;
}

// Arguments is the final type that wraps the Arguments above
// and is the type that is directly used by Bindings and Actions.
export type Arguments = Argument[];

export type ActionFn = (...args: any[]) => void;

export type RedeployFn = (...deps: ContractBinding[]) => Promise<void>;

export type EventFnDeployed = () => Promise<void>;
export type EventFnCompiled = () => void;
export type ContractEventFn = () => void;
export type ModuleEventFn = () => Promise<void>;

export type EventFn = EventFnCompiled | EventFnDeployed | ModuleEventFn;

export interface ModuleParams {
  [name: string]: any;
}

export type ShouldRedeployFn = (
  old: ContractBindingMetaData,
  curr: ContractBinding
) => boolean;

export interface DeployReturn {
  transaction: TransactionReceipt;
  contractAddress: string;
}

export type DeployFn = () => Promise<DeployReturn>;

export enum EventType {
  "ON_CHANGE_EVENT" = "OnChangeEvent",
  "BEFORE_DEPLOY_EVENT" = "BeforeDeployEvent",
  "AFTER_DEPLOY_EVENT" = "AfterDeployEvent",
  "AFTER_COMPILE_EVENT" = "AfterCompileEvent",
  "BEFORE_COMPILE_EVENT" = "BeforeCompileEvent",
  "ON_START" = "OnStart",
  "ON_FAIL" = "OnFail",
  "ON_COMPLETION" = "OnCompletion",
  "ON_SUCCESS" = "OnSuccess",
  "DEPLOY" = "Deploy",
}

export interface BaseEvent {
  name: string;
  eventType: EventType;

  // contract dependencies
  deps: string[];
  // event dependencies
  eventDeps: string[];

  usage: string[];
  eventUsage: string[];

  // moduleMetaData
  moduleName: string;
  subModuleNameDepth: string[];
}

export interface BeforeDeployEvent extends BaseEvent {
  fn: EventFnCompiled;
}

export interface AfterDeployEvent extends BaseEvent {
  fn: EventFnDeployed;
}

export interface BeforeCompileEvent extends BaseEvent {
  fn: ContractEventFn;
}

export interface AfterCompileEvent extends BaseEvent {
  fn: EventFnCompiled;
}

export interface OnChangeEvent extends BaseEvent {
  fn: RedeployFn;
}

export interface ModuleEvent {
  name: string;
  eventType: EventType;
  fn: ModuleEventFn;
}

export interface MetaDataEvent {
  name: string;
  eventType: EventType;
  deps?: string[];
  eventDeps?: string[];
  usage?: string[];
  eventUsage?: string[];
}

export type ContractEvent =
  | BeforeDeployEvent
  | AfterDeployEvent
  | BeforeCompileEvent
  | AfterCompileEvent
  | OnChangeEvent;

export type Event = ContractEvent | ModuleEvent | MetaDataEvent;

export interface Events {
  [name: string]: StatefulEvent;
}

export interface ModuleEvents {
  onStart: { [name: string]: ModuleEvent };
  onSuccess: { [name: string]: ModuleEvent };
  onCompletion: { [name: string]: ModuleEvent };
  onFail: { [name: string]: ModuleEvent };
}

export interface EventsDepRef {
  beforeCompile: string[];
  afterCompile: string[];
  beforeDeploy: string[];
  afterDeploy: string[];
  onChange: string[];
}

export interface Deployed {
  lastEventName: string | undefined;
  logicallyDeployed: boolean | undefined;
  contractAddress: string | undefined;
  shouldRedeploy: ShouldRedeployFn | undefined;
  deploymentSpec:
    | {
        deployFn: DeployFn | undefined;
        deps: Array<ContractBinding | ContractBindingMetaData>; // @TODO this should be depsName to lower ModuleStateFile size
      }
    | undefined;
}

export interface ModuleStateBindings {
  [name: string]: ContractBindingMetaData;
}

/**
 * Module config is simple way to specify if desired contract should be deployed or not.
 */
export interface ModuleConfig {
  contract: {
    [contractName: string]: {
      deploy: boolean;
    };
  };
  defaultOptions: ModuleOptions;
}

export interface FactoryCustomOpts {
  getterFunc?: string;
  getterArgs?: any[];
}

export class StatefulEvent {
  public _isStatefulEvent: boolean = true;

  public event: Event;
  public moduleName: string | undefined;
  public executed: boolean;
  public txData: { [bindingName: string]: EventTransactionData };

  constructor(
    event: Event,
    executed: boolean,
    txData: { [bindingName: string]: EventTransactionData }
  ) {
    this.event = event;
    this.executed = executed;
    this.txData = txData;
  }
}

export interface ModuleOptions {
  // Module parameters used to customize Module behavior.
  params: { [name: string]: any };
}

export type ModuleBuilderFn = (
  m: ModuleBuilder | any,
  wallets: ethers.Signer[]
) => Promise<void>;

export abstract class Binding {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  public deployed(_m: ModuleBuilder): any {
    return {
      name: this.name,
    };
  }
}

export interface SearchParams {
  functionName?: string;
}

export class GroupedDependencies {
  public dependencies: Array<ContractBinding | ContractEvent>;
  public moduleSession: Namespace;

  constructor(
    dependencies: Array<ContractBinding | ContractEvent>,
    moduleSession: Namespace
  ) {
    this.dependencies = dependencies;
    this.moduleSession = moduleSession;
  }

  // util
  public find(searchParams: SearchParams): GroupedDependencies {
    const bindings = this.dependencies.filter(
      (target: ContractBinding | ContractEvent) => {
        return ((target as ContractBinding)?.abi as JsonFragment[]).find(
          ({ name }) => name === searchParams?.functionName
        );
      }
    ) as ContractBinding[];

    return new GroupedDependencies(bindings, this.moduleSession);
  }

  public exclude(...elementNames: string[]): GroupedDependencies {
    const newBindings = this.dependencies.filter((target) => {
      const fullExpr = new RegExp(
        elementNames.map((elementName: string) => elementName).join("|")
      );

      return !fullExpr.test(target.name);
    });

    return new GroupedDependencies(newBindings, this.moduleSession);
  }

  public map(
    fn: (
      value: ContractBinding,
      index: number,
      array: Array<ContractBinding | ContractEvent>
    ) => any
  ): Array<ContractBinding | ContractEvent> {
    const resultArray = [];
    for (let index = 0; index < this.dependencies.length; index++) {
      resultArray.push(
        fn(
          this.dependencies[index] as ContractBinding,
          index,
          this.dependencies
        )
      );
    }

    return resultArray;
  }

  public shouldRedeploy(fn: ShouldRedeployFn): void {
    for (let dependency of this.dependencies) {
      dependency = dependency as ContractBinding;
      if (dependency._isContractBinding) {
        if (dependency.deployMetaData.shouldRedeploy !== undefined) {
          throw new ShouldRedeployAlreadyDefinedError(dependency.name);
        }

        dependency.deployMetaData.shouldRedeploy = fn;
      }
    }
  }

  // event hooks
  // beforeDeploy runs each time the Binding is about to be triggered.
  // This event can be used to force the binding in question to be deployed.
  public beforeDeploy(
    m: ModuleBuilder,
    eventName: string,
    fn: EventFnCompiled,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.BEFORE_DEPLOY_EVENT,
      this.dependencies,
      usages,
      this.moduleSession
    );
    const beforeDeploy: BeforeDeployEvent = {
      ...generateBaseEvent,
      fn,
    };

    for (let dep of this.dependencies) {
      dep = dep as ContractBinding;
      if (dep._isContractBinding) {
        if (dep.eventsDeps.beforeDeploy.includes(eventName)) {
          continue;
        }

        dep.eventsDeps.beforeDeploy.push(eventName);
      }
    }

    m.addEvent(eventName, beforeDeploy);
    return beforeDeploy;
  }

  // afterDeploy runs after the Binding was deployed.
  public afterDeploy(
    m: ModuleBuilder,
    eventName: string,
    fn: EventFnDeployed,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.AFTER_DEPLOY_EVENT,
      this.dependencies,
      usages,
      this.moduleSession
    );
    const afterDeploy: AfterDeployEvent = {
      ...generateBaseEvent,
      fn,
    };

    for (let dep of this.dependencies) {
      dep = dep as ContractBinding;
      if (dep._isContractBinding) {
        if (dep.eventsDeps.afterDeploy.includes(eventName)) {
          continue;
        }

        dep.eventsDeps.afterDeploy.push(eventName);
      }
    }

    m.addEvent(eventName, afterDeploy);
    return afterDeploy;
  }

  // beforeCompile runs before the source code is compiled.
  public beforeCompile(
    m: ModuleBuilder,
    eventName: string,
    fn: ContractEventFn,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.BEFORE_COMPILE_EVENT,
      this.dependencies,
      usages,
      this.moduleSession
    );
    const beforeCompile: BeforeCompileEvent = {
      ...generateBaseEvent,
      fn,
    };

    for (let dep of this.dependencies) {
      dep = dep as ContractBinding;
      if (dep._isContractBinding) {
        if (dep.eventsDeps.beforeCompile.includes(eventName)) {
          continue;
        }

        dep.eventsDeps.beforeCompile.push(eventName);
      }
    }

    m.addEvent(eventName, beforeCompile);
    return beforeCompile;
  }

  // afterCompile runs after the source code is compiled and the bytecode is available.
  public afterCompile(
    m: ModuleBuilder,
    eventName: string,
    fn: EventFnCompiled,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.AFTER_COMPILE_EVENT,
      this.dependencies,
      usages,
      this.moduleSession
    );
    const afterCompile: AfterCompileEvent = {
      ...generateBaseEvent,
      fn,
    };

    for (let dep of this.dependencies) {
      dep = dep as ContractBinding;
      if (dep._isContractBinding) {
        if (dep.eventsDeps.afterCompile.includes(eventName)) {
          continue;
        }

        dep.eventsDeps.afterCompile.push(eventName);
      }
    }

    m.addEvent(eventName, afterCompile);
    return afterCompile;
  }

  // onChange runs after the Binding gets redeployed or changed
  public onChange(
    m: ModuleBuilder,
    eventName: string,
    fn: RedeployFn,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.ON_CHANGE_EVENT,
      this.dependencies,
      usages,
      this.moduleSession
    );
    const onChangeEvent: OnChangeEvent = {
      ...generateBaseEvent,
      fn,
    };

    for (let dep of this.dependencies) {
      dep = dep as ContractBinding;
      if (dep._isContractBinding) {
        if (dep.eventsDeps.onChange.includes(eventName)) {
          continue;
        }

        dep.eventsDeps.onChange.push(eventName);
      }
    }

    m.addEvent(eventName, onChangeEvent);
    return onChangeEvent;
  }
}

export class ContractBinding extends Binding {
  public static generateBaseEvent(
    eventName: string,
    eventType: EventType,
    dependencies: Array<ContractBinding | ContractEvent>,
    usages: Array<ContractBinding | ContractEvent>,
    moduleSession: Namespace
  ): BaseEvent {
    const usageBindings: string[] = [];
    const eventUsages: string[] = [];

    for (const usage of usages) {
      if ((usage as ContractBinding)._isContractBinding) {
        usageBindings.push(usage.name);
      } else {
        eventUsages.push((usage as ContractEvent).name);
      }
    }

    const depBindings: string[] = [];
    const depEvents: string[] = [];
    for (const dep of dependencies) {
      if ((dep as ContractBinding)._isContractBinding) {
        depBindings.push(dep.name);
      } else {
        depEvents.push((dep as ContractEvent).name);
      }
    }
    const moduleName = copyValue(moduleSession.get(ClsNamespaces.MODULE_NAME));
    const subModuleNameDepth = copyValue(
      moduleSession.get(ClsNamespaces.MODULE_DEPTH_NAME) ?? []
    );

    return {
      name: eventName,
      eventType,
      deps: depBindings,
      eventDeps: depEvents,
      usage: usageBindings,
      eventUsage: eventUsages,
      moduleName,
      subModuleNameDepth,
    };
  }

  public _isContractBinding: boolean = true;

  public contractName: string;
  public args: Arguments;
  public eventsDeps: EventsDepRef;
  public deployMetaData: Deployed;

  public moduleName: string;
  public subModuleNameDepth: string[];
  public subModule: string;

  public bytecode: string = "";
  public abi: JsonFragment[] | undefined;
  public library: boolean = false;
  public libraries: SingleContractLinkReference | undefined;

  public txData: TransactionData | undefined;
  public contractTxProgress: number | undefined;

  public forceFlag: boolean;

  public signer: ethers.Signer | undefined;
  public prompter: ILogging | undefined;
  public txGenerator: ITransactionGenerator | undefined;
  public moduleStateRepo: IModuleStateRepo | undefined;
  public eventTxExecutor: EventTxExecutor | undefined;
  public eventSession: Namespace | undefined;
  public moduleSession: Namespace;

  private _contractInstance: ethers.Contract | undefined;

  constructor(
    // metadata
    name: string,
    contractName: string,
    args: Arguments,
    moduleName: string,
    subModuleNameDepth: string[],
    subModule: string,
    moduleSession: Namespace,
    bytecode?: string,
    abi?: JsonFragment[],
    libraries?: SingleContractLinkReference,
    deployMetaData?: Deployed,
    txData?: TransactionData,
    // event hooks
    events?: EventsDepRef,
    signer?: ethers.Signer,
    logger?: ILogging,
    txGenerator?: ITransactionGenerator,
    moduleStateRepo?: IModuleStateRepo,
    eventTxExecutor?: EventTxExecutor,
    eventSession?: Namespace
  ) {
    super(name);
    this.args = args;
    this.contractName = contractName;
    this.deployMetaData = deployMetaData ?? {
      logicallyDeployed: undefined,
      contractAddress: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      deploymentSpec: {
        deployFn: undefined,
        deps: [],
      },
    };
    this.eventsDeps = events ?? {
      beforeCompile: [],
      afterCompile: [],
      beforeDeploy: [],
      afterDeploy: [],
      onChange: [],
    };

    if (bytecode !== undefined) {
      this.bytecode = bytecode;
    }
    this.abi = abi;
    this.libraries = libraries;

    this.txData = txData;
    this.contractTxProgress = 0;

    this._contractInstance = undefined;

    this.signer = signer;
    this.prompter = logger;
    this.txGenerator = txGenerator;
    this.moduleStateRepo = moduleStateRepo;
    this.eventTxExecutor = eventTxExecutor;
    this.eventSession = eventSession;

    this.forceFlag = false;
    this.moduleName = moduleName;
    this.subModuleNameDepth = subModuleNameDepth;
    this.subModule = subModule;
    this.moduleSession = moduleSession;
  }

  /**
   * This is only available to be called inside event hook function execution.
   *
   * This function is instantiating wrapped ether.Contract. It has all ether.Contract functionality, as shown in
   * interface, with record keeping functionality. This is needed in case if some of underlying contract function
   * fail in execution so when hardhat-ignition continue it will "skip" successfully executed transaction.
   */
  public deployed(): ethers.Contract {
    if (this._contractInstance !== undefined) {
      return this._contractInstance;
    }

    if (!checkIfSuitableForInstantiating(this)) {
      const eventName = this.eventSession?.get(ClsNamespaces.EVENT_NAME) ?? "";
      throw new ContractNotDeployedError(
        this.name,
        this.contractName,
        eventName
      );
    }

    this._contractInstance = (new ContractInstance(
      this,
      this.deployMetaData?.contractAddress as string,
      this.abi as JsonFragment[],
      this.signer as ethers.Signer,
      this.prompter as ILogging,
      this.txGenerator as ITransactionGenerator,
      this.moduleStateRepo as IModuleStateRepo,
      this.eventTxExecutor as EventTxExecutor,
      this.eventSession as Namespace
    ) as unknown) as ethers.Contract;

    return this._contractInstance;
  }

  /**
   * Sets custom contract deployer. This means that `signer` is going to sing contract creation transaction.
   *
   * @param signer Ethers signer object referencing deployer.
   */
  public setDeployer(signer: ethers.Signer): ContractBinding {
    this.signer = signer;

    return this;
  }

  /**
   * Flag provided in case user wants to force contract deployment even if contract is already has record in state file.
   */
  public force(): ContractBinding {
    this.forceFlag = true;

    return this;
  }

  /**
   * Ability for hot-swapping contract bytecode in case of any on-fly changes by user.
   *
   * @param bytecode New contract bytecode.
   */
  public changeBytecode(bytecode: string) {
    this.bytecode = bytecode;
  }

  /**
   * This functions is setting library flag to true, in order for hardhat-ignition to know how to resolve library usage.
   */
  public setLibrary() {
    this.library = true;
  }

  /**
   * This is helper function that is setting new logic contract for proxy.
   *
   * @param m ModuleBuilder object
   * @param proxy Proxy contract deployed
   * @param logic Logic contract deployed
   * @param setLogicFuncName Function used to change logic contract in proxy
   */
  public proxySetNewLogic(
    m: ModuleBuilder,
    proxy: ContractBinding,
    logic: ContractBinding,
    setLogicFuncName: string
  ): void {
    m.group(proxy, logic).afterDeploy(
      m,
      `setNewLogicContract${proxy.name}${logic.name}`,
      async () => {
        await proxy.deployed()[setLogicFuncName](logic);
      }
    );
  }

  /**
   * Helper function for factory contracts to easily create new children contracts.
   *
   * @param m ModuleBuilder object.
   * @param childName Child contract name
   * @param createFuncName Contract creation func name in factory
   * @param args Contract creation arguments
   * @param opts Custom object that can overwrite smartly defined getterFunc and getterArgs.
   */
  public factoryCreate(
    m: ModuleBuilder,
    childName: string,
    createFuncName: string,
    args: any[],
    opts?: FactoryCustomOpts
  ): ContractBinding {
    const getFunctionName =
      opts?.getterFunc ?? `get${createFuncName.substr(5)}`;
    const getFunctionArgs = opts?.getterArgs ?? [];

    const child = m.contract(childName);
    child.deployFn(async () => {
      const tx = await this.deployed()[createFuncName](...args);

      const children = await this.deployed()[getFunctionName](getFunctionArgs);

      return {
        transaction: tx,
        contractAddress: children[0],
      };
    }, this);

    return child;
  }

  /**
   * Custom deploy function that
   *
   * @param deployFn
   * @param deps
   */
  public deployFn(
    deployFn: DeployFn,
    ...deps: ContractBinding[]
  ): ContractBinding {
    this.deployMetaData.deploymentSpec = {
      deployFn,
      deps,
    };

    return this;
  }

  /**
   * Before deploy event hook. It is running only if contract that event is bounded to this event is actually going to
   * be deployed.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeploy -> onChange -> afterDeploy
   * -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn
   * @param usages
   */
  public beforeDeploy(
    m: ModuleBuilder,
    eventName: string,
    fn: EventFnCompiled,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    if (this.eventsDeps.beforeDeploy.includes(eventName)) {
      throw new EventNameExistsError(eventName);
    }
    this.eventsDeps.beforeDeploy.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.BEFORE_DEPLOY_EVENT,
      [this],
      usages,
      this.moduleSession
    );

    const beforeDeployEvent: BeforeDeployEvent = {
      ...generateBaseEvent,
      fn,
    };
    m.addEvent(eventName, beforeDeployEvent);

    return beforeDeployEvent;
  }

  /**
   *  After deploy event hook. It is running only if contract that event is bounded to this event is actually going to
   *  be deployed.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeploy -> onChange -> afterDeploy
   * -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object
   * @param eventName Unique event name
   * @param fn
   * @param usages
   */
  public afterDeploy(
    m: ModuleBuilder,
    eventName: string,
    fn: EventFnDeployed,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    if (this.eventsDeps.afterDeploy.includes(eventName)) {
      throw new EventNameExistsError(eventName);
    }
    this.eventsDeps.afterDeploy.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.AFTER_DEPLOY_EVENT,
      [this],
      usages,
      this.moduleSession
    );

    const afterDeployEvent: AfterDeployEvent = {
      ...generateBaseEvent,
      fn,
    };
    m.addEvent(eventName, afterDeployEvent);

    return afterDeployEvent;
  }

  /**
   * This function is assigning custom ShouldRedeployFn that is returning either true or false, that is enabling for
   * hardhat-ignition to determine if this contract should be redeployed. As argument inside the ShouldRedeployFn is curr
   * parameter is contract with state file metadata for that contract. This way you can determine if their is a need
   * for contract to be redeployed.
   *
   * @param fn Function that is suggesting if contract should be redeployed.
   */
  public shouldRedeploy(fn: ShouldRedeployFn): void {
    this.deployMetaData.shouldRedeploy = fn;
  }

  /**
   *  Before compile event hook. Runs immediately before compile.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeploy -> onChange -> afterDeploy
   * -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn
   * @param usages
   */
  public beforeCompile(
    m: ModuleBuilder,
    eventName: string,
    fn: ContractEventFn,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    if (this.eventsDeps.beforeCompile.includes(eventName)) {
      throw new EventNameExistsError(eventName);
    }
    this.eventsDeps.beforeCompile.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.BEFORE_COMPILE_EVENT,
      [this],
      usages,
      this.moduleSession
    );

    const beforeCompileEvent: BeforeCompileEvent = {
      ...generateBaseEvent,
      fn,
    };
    m.addEvent(eventName, beforeCompileEvent);

    return beforeCompileEvent;
  }

  /**
   *  After compile event hook. Runs immediately after compile event when bytecode, abi and other metadata is available.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeploy -> onChange -> afterDeploy
   * -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn
   * @param usages
   */
  public afterCompile(
    m: ModuleBuilder,
    eventName: string,
    fn: EventFnCompiled,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    if (this.eventsDeps.afterCompile.includes(eventName)) {
      throw new EventNameExistsError(eventName);
    }
    this.eventsDeps.afterCompile.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.AFTER_COMPILE_EVENT,
      [this],
      usages,
      this.moduleSession
    );

    const afterCompileEvent: AfterCompileEvent = {
      ...generateBaseEvent,
      fn,
    };
    m.addEvent(eventName, afterCompileEvent);

    return afterCompileEvent;
  }

  /**
   *  On change event hook. Runs only if contract has been changed.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeploy -> onChange -> afterDeploy
   * -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn
   * @param usages
   */
  public onChange(
    m: ModuleBuilder,
    eventName: string,
    fn: RedeployFn,
    ...usages: Array<ContractBinding | ContractEvent>
  ): ContractEvent {
    if (this.eventsDeps.onChange.includes(eventName)) {
      throw new EventNameExistsError(eventName);
    }
    this.eventsDeps.onChange.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(
      eventName,
      EventType.ON_CHANGE_EVENT,
      [this],
      usages,
      this.moduleSession
    );

    const onChangeEvent: OnChangeEvent = {
      ...generateBaseEvent,
      fn,
    };
    m.addEvent(eventName, onChangeEvent);

    return onChangeEvent;
  }
}

export class Action {
  public name: string;
  public action: ActionFn;

  constructor(name: string, action: ActionFn) {
    this.name = name;
    this.action = action;
  }
}

export interface TxData {
  from: string;
  input?: string;
}

export interface ContractInput {
  functionName: string;
  inputs: JsonFragmentType[];
}

export interface TransactionData {
  input: TxData | TransactionResponse;
  output?: TransactionReceipt;
}

export interface EventTransactionData {
  contractInput: ContractInput[];
  contractOutput: TransactionReceipt[];
}

export class ContractInstance {
  [key: string]: any;

  private static _formatArgs(args: any[]): any[] {
    let i = 0;
    for (let arg of args) {
      if (
        checkIfExist(arg?.contractName) &&
        !checkIfExist(arg?.deployMetaData.contractAddress)
      ) {
        throw new ContractNotDeployedError(
          arg.name,
          arg.contractName,
          arg.moduleName
        );
      }

      if (checkIfExist(arg?.deployMetaData?.contractAddress)) {
        arg = arg as ContractBinding;

        args[i] = arg.deployMetaData.contractAddress;
      }

      i++;
    }

    return args;
  }

  private readonly _contractBinding: ContractBinding;
  private readonly _prompter: ILogging;
  private readonly _moduleStateRepo: IModuleStateRepo;
  private readonly _eventTxExecutor: EventTxExecutor;
  private readonly _eventSession: Namespace;
  private readonly _txGenerator: ITransactionGenerator;

  private _signer: ethers.Signer;

  constructor(
    contractBinding: ContractBinding,
    contractAddress: string,
    abi: JsonFragment[],
    signer: ethers.Signer,
    prompter: ILogging,
    txGenerator: ITransactionGenerator,
    moduleStateRepo: IModuleStateRepo,
    eventTxExecutor: EventTxExecutor,
    eventSession: Namespace
  ) {
    this._prompter = prompter;
    this._txGenerator = txGenerator;
    this._contractBinding = contractBinding;
    this._eventTxExecutor = eventTxExecutor;
    this._eventSession = eventSession;
    this._signer = signer;

    if (!checkIfExist(this._contractBinding?.contractTxProgress)) {
      this._contractBinding.contractTxProgress = 0;
    }

    this._moduleStateRepo = moduleStateRepo;
    const parent: any = new ethers.Contract(contractAddress, abi, signer);

    Object.keys(parent.interface.functions).forEach((signature) => {
      const fragment = parent.interface.functions[signature];

      if (parent[signature] !== undefined) {
        if (fragment.constant) {
          this[signature] = this._buildConstantWrappers(parent[signature]);
          this[fragment.name] = this[signature];
          return;
        }

        this[signature] = this._buildDefaultWrapper(
          parent[signature],
          fragment
        );
        this[fragment.name] = this[signature];
      }
    });

    Object.keys(parent.interface.structs).forEach((fragment) => {
      const struct = parent.interface.structs[fragment];

      if (struct !== undefined) {
        this[fragment] = this._buildStructWrappers(parent[fragment]);
        this[fragment] = this[fragment];
        return;
      }
    });

    Object.keys(parent).forEach((key) => {
      if (this[key] !== undefined) {
        return;
      }

      this[key] = parent[key];
    });
  }

  public withSigner(wallet: ethers.Wallet) {
    if (wallet._isSigner) {
      this._signer = (wallet as unknown) as ethers.Signer;
    }
  }

  private _buildDefaultWrapper(
    contractFunction: ContractFunction,
    fragment: FunctionFragment
  ): ContractFunction {
    return async (...args: any[]): Promise<TransactionResponse> => {
      // tslint:disable-next-line:unnecessary-bind
      const func = async function (
        this: ContractInstance,
        ...funcArgs: any[]
      ): Promise<TransactionResponse | TransactionReceipt> {
        const sessionEventName = this._eventSession.get(
          ClsNamespaces.EVENT_NAME
        );

        if (
          // optional overrides
          funcArgs.length > fragment.inputs.length + 1 ||
          funcArgs.length < fragment.inputs.length
        ) {
          throw new ArgumentLengthInvalid(fragment.name, fragment.inputs);
        }

        let overrides: CallOverrides = {};
        if (funcArgs.length === fragment.inputs.length + 1) {
          overrides = funcArgs.pop() as CallOverrides;
        }

        funcArgs = ContractInstance._formatArgs(funcArgs);

        let contractTxIterator = this._contractBinding?.contractTxProgress ?? 0;

        const currentEventTransactionData = await this._moduleStateRepo.getEventTransactionData(
          this._contractBinding.name,
          sessionEventName
        );

        if (
          currentEventTransactionData.contractOutput.length > contractTxIterator
        ) {
          this._contractBinding.contractTxProgress = ++contractTxIterator;
          return currentEventTransactionData.contractOutput[
            contractTxIterator - 1
          ];
        }

        const currentInputs =
          currentEventTransactionData.contractInput[contractTxIterator];
        const contractOutput =
          currentEventTransactionData.contractOutput[contractTxIterator];

        if (
          checkIfExist(currentInputs) &&
          checkIfSameInputs(currentInputs, fragment.name, funcArgs) &&
          checkIfExist(contractOutput)
        ) {
          this._prompter.contractFunctionAlreadyExecuted(
            fragment.name,
            ...funcArgs
          );
          cli.info(
            "Contract function already executed: ",
            fragment.name,
            ...funcArgs,
            "... skipping"
          );

          this._contractBinding.contractTxProgress = ++contractTxIterator;
          return contractOutput;
        }

        if (
          (checkIfExist(currentInputs) &&
            !checkIfSameInputs(currentInputs, fragment.name, funcArgs)) ||
          !checkIfExist(currentInputs)
        ) {
          currentEventTransactionData.contractInput[contractTxIterator] = {
            functionName: fragment.name,
            inputs: funcArgs,
          };
        }

        this._prompter.executeContractFunction(fragment.name);
        await this._prompter.promptExecuteTx();

        const txData = await this._txGenerator.fetchTxData(
          await this._signer.getAddress()
        );
        overrides = {
          gasPrice: overrides.gasPrice ?? txData.gasPrice,
          value: overrides.value,
          gasLimit: overrides.gasLimit,
          nonce: txData.nonce,
        };

        this._prompter.sendingTx(sessionEventName, fragment.name);
        let tx;
        try {
          tx = await contractFunction(...funcArgs, overrides);
          currentEventTransactionData.contractInput[contractTxIterator] = tx;
        } catch (err) {
          throw err;
        }
        this._prompter.sentTx(sessionEventName, fragment.name);
        await this._moduleStateRepo.storeEventTransactionData(
          this._contractBinding.name,
          currentEventTransactionData.contractInput[contractTxIterator],
          undefined,
          sessionEventName
        );

        this._prompter.waitTransactionConfirmation();

        this._contractBinding.contractTxProgress = ++contractTxIterator;
        this._prompter.finishedExecutionOfContractFunction(fragment.name);

        return tx;
      }.bind(this);

      const currentEventAbstraction = this._eventSession.get(
        ClsNamespaces.EVENT_NAME
      );
      const txSender = await this._signer.getAddress();
      this._eventTxExecutor.add(
        currentEventAbstraction,
        txSender,
        this._contractBinding.name,
        func
      );

      return this._eventTxExecutor.executeSingle(
        currentEventAbstraction,
        ...args
      );
    };
  }

  private _buildConstantWrappers(
    contractFunction: ContractFunction
  ): ContractFunction {
    return async (...args: any[]): Promise<TransactionResponse> => {
      args = ContractInstance._formatArgs(args);

      return contractFunction(...args);
    };
  }

  private _buildStructWrappers(struct: any): any {
    return async (...args: any[]): Promise<TransactionResponse> => {
      args = ContractInstance._formatArgs(args);

      return struct(...args);
    };
  }
}

export class IgnitionSigner {
  public _signer: ethers.Signer;

  private _sessionNamespace: Namespace;
  private _moduleStateRepo: IModuleStateRepo;
  private _nonceManager: INonceManager;
  private _gasPriceCalculator: IGasPriceCalculator;
  private _gasCalculator: IGasCalculator;
  private _prompter: ILogging;
  private _eventTxExecutor: EventTxExecutor;

  constructor(
    signer: ethers.Signer,
    sessionNamespace: Namespace,
    nonceManager: INonceManager,
    gasPriceCalculator: IGasPriceCalculator,
    gasCalculator: IGasCalculator,
    moduleStateRepo: IModuleStateRepo,
    prompter: ILogging,
    eventTxExecutor: EventTxExecutor
  ) {
    this._sessionNamespace = sessionNamespace;
    this._nonceManager = nonceManager;
    this._gasPriceCalculator = gasPriceCalculator;
    this._gasCalculator = gasCalculator;
    this._moduleStateRepo = moduleStateRepo;
    this._prompter = prompter;
    this._eventTxExecutor = eventTxExecutor;

    this._signer = signer;
  }

  public async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    const address = await this._signer.getAddress();

    const func = async (): Promise<TransactionResponse> => {
      const toAddr = (await transaction.to) as string;
      if (toAddr === undefined) {
        throw new MissingToAddressInWalletTransferTransaction();
      }
      this._prompter.executeWalletTransfer(address, toAddr);
      const currEventName = this._sessionNamespace.get(
        ClsNamespaces.EVENT_NAME
      );
      if (!checkIfExist(currEventName)) {
        throw new WalletTransactionNotInEventError();
      }

      this._prompter.sendingTx(currEventName, "raw wallet transaction");

      let ignitionTransaction;
      try {
        ignitionTransaction = await this._populateTransactionWithIgnitionMetadata(
          transaction
        );
      } catch (err) {
        throw err;
      }

      const txResp = await this._signer.sendTransaction(ignitionTransaction);
      this._prompter.sentTx(currEventName, "raw wallet transaction");
      await this._moduleStateRepo.storeEventTransactionData(
        address,
        undefined,
        undefined,
        currEventName
      );

      this._prompter.finishedExecutionOfWalletTransfer(address, toAddr);

      return txResp;
    };

    const currentEventName = this._sessionNamespace.get(
      ClsNamespaces.EVENT_NAME
    );
    this._eventTxExecutor.add(currentEventName, address, address, func);

    return this._eventTxExecutor.executeSingle(currentEventName);
  }

  public async getAddress(): Promise<string> {
    return this._signer.getAddress();
  }

  public async signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    return this._signer.signTransaction(transaction);
  }

  private async _populateTransactionWithIgnitionMetadata(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionRequest> {
    const address = await this._signer.getAddress();
    if (!checkIfExist(transaction.nonce)) {
      transaction.nonce = this._nonceManager.getAndIncrementTransactionCount(
        address
      );
    }

    if (!checkIfExist(transaction.gasPrice)) {
      transaction.gasPrice = await this._gasPriceCalculator.getCurrentPrice();
    }

    if (!checkIfExist(transaction.gasPrice)) {
      const toAddr = await transaction.to;
      const data = await transaction.data;
      if (data !== undefined) {
        transaction.gasLimit = await this._gasCalculator.estimateGas(
          address,
          toAddr,
          data
        );
      }
    }

    return this._signer.populateTransaction(transaction);
  }
}

export class ContractBindingMetaData {
  public _isContractBindingMetaData: boolean = true;

  public name: string;
  public contractName: string;
  public args: Arguments;
  public bytecode: string = "";
  public abi: JsonFragment[] | undefined;
  public libraries: SingleContractLinkReference | undefined;
  public txData: TransactionData | undefined;
  public deployMetaData: Deployed;

  public library: boolean = false;

  constructor(
    name: string,
    contractName: string,
    args: Arguments,
    bytecode?: string,
    abi?: JsonFragment[],
    library?: boolean,
    libraries?: SingleContractLinkReference,
    txData?: TransactionData,
    deployMetaData?: Deployed
  ) {
    this.name = name;
    this.contractName = contractName;
    this.args = args;
    if (bytecode !== undefined) {
      this.bytecode = bytecode;
    }
    this.abi = abi;
    if (library !== undefined) {
      this.library = library;
    }
    this.libraries = libraries;
    this.txData = txData;
    this.deployMetaData = deployMetaData ?? {
      logicallyDeployed: undefined,
      contractAddress: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      deploymentSpec: {
        deployFn: undefined,
        deps: [],
      },
    };
  }
}

/**
 * ModuleBuilder is essential backbone in building your deployment infrastructure. It stores raw contract bindings,
 * contract event hooks, module event hooks and actions. It is surfacing interface for user interaction for specifying
 * this sub-components of the ModuleBuilder.
 */
export class ModuleBuilder {
  [key: string]: ContractBinding | Event | Action | any;

  private _params: ModuleParams;
  private readonly _bindings: { [name: string]: ContractBinding };
  private readonly _contractEvents: Events;
  private readonly _moduleEvents: ModuleEvents;
  private readonly _actions: { [name: string]: Action };
  private _templates: { [name: string]: Template };

  private _gasPriceProvider: IGasPriceCalculator | undefined;
  private _nonceManager: INonceManager | undefined;
  private _transactionSigner: ITransactionSigner | undefined;

  private readonly _subModules: ModuleBuilder[];
  private readonly _moduleSession: Namespace;
  private _extractor: IContractDataExtractor;
  private _moduleValidator: IModuleValidator;

  constructor(
    moduleSession: Namespace,
    compiler: IContractDataExtractor,
    moduleValidator: IModuleValidator,
    params?: ModuleParams
  ) {
    this._bindings = {};
    this._actions = {};
    this._templates = {};
    this._resolver = undefined;
    this._registry = undefined;
    this._contractEvents = {};
    this._moduleEvents = {
      onFail: {},
      onSuccess: {},
      onCompletion: {},
      onStart: {},
    };
    this._params = {};
    if (checkIfExist(params)) {
      this._params = params ?? {};
    }
    this._subModules = [];
    this._moduleSession = moduleSession;
    this._extractor = compiler;
    this._moduleValidator = moduleValidator;
  }

  /**
   * Define contract with name and his constructor arguments.
   *
   * Usage example: m.contract(name, arg1, arg2, ...)
   *
   * @param name Contract name defined in solidity file.
   * @param args Constructor arguments. In case of contract binding just provide reference.
   */
  public contract(name: string, ...args: Arguments): ContractBinding {
    if (checkIfExist(this._bindings[name])) {
      cli.info("Contract already bind to the module - ", name); // @TODO add typed error
      cli.exit(0);
    }

    const moduleName = this._moduleSession.get(ClsNamespaces.MODULE_NAME);
    const subModuleNameDepth =
      this._moduleSession.get(ClsNamespaces.MODULE_DEPTH_NAME) ?? [];
    const subModule = this._moduleSession.get(ClsNamespaces.SUB_MODULE_NAME);
    this._bindings[name] = new ContractBinding(
      name,
      name,
      args,
      moduleName,
      subModuleNameDepth.slice(0),
      subModule,
      this._moduleSession
    );
    this[name] = this._bindings[name];
    return this._bindings[name];
  }

  /**
   * Define contract with name and his constructor arguments that is library to other contracts.
   *
   * Usage example: m.library(name, arg1, arg2, ...)
   *
   * @param name Contract name.
   * @param args Constructor arguments, if any.
   */
  public library(name: string, ...args: Arguments): ContractBinding {
    const binding = this.contract(name, ...args);
    binding.setLibrary();

    return binding;
  }

  /**
   * This grouping of contract's and event hooks in order to assign event that has multiple dependencies.
   *
   * e.g. This is useful if you want to run afterDeploy event hook for multiple contracts.
   *
   * @param dependencies
   */
  public group(
    ...dependencies: Array<ContractBinding | ContractEvent>
  ): GroupedDependencies {
    return new GroupedDependencies(dependencies, this._moduleSession);
  }

  /**
   * Contract template is the way to say to hardhat-ignition that this contract is going to be deployed multiple times.
   *
   * @param name Solidity contract name
   */
  public contractTemplate(name: string): Template {
    this._templates[name] = new Template(name);

    return this._templates[name];
  }

  /**
   * Create contract deployment for contract with `templateName` that you previously defined.
   *
   * @param name Unique "friendly" contract name
   * @param templateName Solidity contract name provided in .contractTemplate() function
   * @param args Constructor arguments.
   */
  public bindTemplate(
    name: string,
    templateName: string,
    ...args: Arguments
  ): ContractBinding {
    if (checkIfExist(this._bindings[name])) {
      throw new BindingsConflict(
        `Contract already bind to the module - ${name}`
      );
    }

    if (!checkIfExist(this._templates[templateName])) {
      throw new TemplateNotFound(
        `Template with name ${templateName} is not found in this module`
      );
    }

    const moduleName = this._moduleSession.get(ClsNamespaces.MODULE_NAME);
    const subModuleNameDepth =
      this._moduleSession.get(ClsNamespaces.MODULE_DEPTH_NAME) ?? [];
    const subModule = this._moduleSession.get(ClsNamespaces.SUB_MODULE_NAME);
    this._bindings[name] = new ContractBinding(
      name,
      this._templates[templateName].contractName,
      args,
      moduleName,
      subModuleNameDepth.slice(0),
      subModule,
      this._moduleSession
    );
    this[name] = this._bindings[name];

    return this._bindings[name];
  }

  /**
   * Sets single custom module parameter.
   *
   * @param name Parameter name
   * @param value Parameter value.
   */
  public param(name: string, value: any) {
    this._params.params[name] = value;
  }

  /**
   * Fetching custom module parameter.
   *
   * @param name
   */
  public getParam(name: string): any {
    if (!checkIfExist(this._params)) {
      throw new CliError(
        "This module doesnt have params, check if you are deploying right module!"
      );
    }

    return this._params.params[name];
  }

  /**
   * Sets custom module parameters.
   *
   * @param moduleParams Module parameters.
   */
  public setParam(moduleParams: ModuleParams) {
    if (!checkIfExist(moduleParams)) {
      return;
    }

    this._params = moduleParams;

    for (const [paramName, param] of Object.entries(moduleParams)) {
      this[paramName] = param;
    }
  }

  public addEvent(eventName: string, event: Event): void {
    if (checkIfExist(this._contractEvents[eventName])) {
      throw new EventNameExistsError(eventName);
    }

    this._contractEvents[eventName] = new StatefulEvent(event, false, {});
    this[eventName] = this._contractEvents[eventName];
  }

  public getEvent(eventName: string): StatefulEvent {
    if (!checkIfExist(this._contractEvents[eventName])) {
      throw new EventDoesntExistError(eventName);
    }

    return this._contractEvents[eventName];
  }

  public getAllEvents(): Events {
    return this._contractEvents;
  }

  public getAllModuleEvents(): ModuleEvents {
    return this._moduleEvents;
  }

  /**
   * Action is best way to wrap some dynamic functionality in order to be executed in later execution.
   *
   * @param name Action name
   * @param fn User defined custom fucntion.
   */
  public registerAction(name: string, fn: ActionFn): Action {
    const action = new Action(name, fn);
    this._actions[name] = action;
    this[name] = this._actions[name];

    return action;
  }

  /**
   * Assigning sub-module. This function will share current share current module builder data (contracts and event) with
   * sub-module. On function execution it will return the context.
   *
   * @param m Module object
   * @param params Optional module options
   * @param signers Optional wallets that is going to be surfaced inside sub-module,
   *
   * @returns Module builder data from sub-module.
   */
  public async useModule(
    m: Module | Promise<Module>,
    params?: ModuleParams,
    signers: ethers.Signer[] | any[] = []
  ): Promise<ModuleBuilder> {
    const moduleParams = { ...this._params, ...params };

    if (m instanceof Promise) {
      m = await m;
    }

    if (m.isInitialized()) {
      throw new ModuleIsAlreadyInitialized();
    }

    const moduleBuilder = await m.init(
      this._moduleSession,
      this._extractor,
      this._moduleValidator,
      signers,
      this,
      moduleParams
    );
    const oldDepth =
      this._moduleSession.get(ClsNamespaces.MODULE_DEPTH_NAME) ?? [];
    if (oldDepth.length >= 1) {
      oldDepth.pop();
    }
    this._moduleSession.set(ClsNamespaces.MODULE_DEPTH_NAME, oldDepth);

    const bindings = m.getAllBindings();
    const events = m.getAllEvents();

    for (const [eventName, event] of Object.entries(events)) {
      if (checkIfExist(this._contractEvents[eventName])) {
        continue;
      }

      this.addEvent(eventName, event.event);
    }

    for (const [bindingName, binding] of Object.entries(bindings)) {
      if (
        checkIfExist(this._bindings[bindingName]) &&
        this._bindings[bindingName] !== undefined &&
        !isSameBytecode(this._bindings[bindingName].bytecode, binding.bytecode)
      ) {
        continue;
      }

      this[bindingName] = binding;
      this._bindings[bindingName] = binding;
    }

    this._templates = m.getAllTemplates();

    return moduleBuilder;
  }

  public getAllSubModules(): ModuleBuilder[] {
    return this._subModules;
  }

  public getBinding(name: string): ContractBinding {
    return this._bindings[name];
  }

  public getAllBindings(): { [name: string]: ContractBinding } {
    return this._bindings;
  }

  public getAllActions(): { [name: string]: Action } {
    return this._actions;
  }

  public setCustomGasPriceProvider(provider: IGasPriceCalculator): void {
    this._gasPriceProvider = provider;
  }

  public getCustomGasPriceProvider(): IGasPriceCalculator | undefined {
    return this._gasPriceProvider;
  }

  public setCustomNonceManager(nonceManager: INonceManager): void {
    this._nonceManager = nonceManager;
  }

  public getCustomNonceManager(): INonceManager | undefined {
    return this._nonceManager;
  }

  public setCustomTransactionSigner(txSigner: ITransactionSigner): void {
    this._transactionSigner = txSigner;
  }

  public getCustomTransactionSigner(): ITransactionSigner | undefined {
    return this._transactionSigner;
  }

  public getAllTemplates(): { [name: string]: Template } {
    return this._templates;
  }

  public getAllParams(): ModuleParams {
    return this._params;
  }

  /**
   * OnStart Module event. This event is always running first, before another event in event lifecycle.
   *
   * @param eventName Unique event name
   * @param fn Module event function
   */
  public onStart(eventName: string, fn: ModuleEventFn): void {
    this._moduleEvents.onStart[eventName] = {
      name: eventName,
      eventType: EventType.ON_START,
      fn,
    };
  }

  /**
   * OnCompletion module event is run when module execution is finished, event if it has errored.
   *
   * @param eventName Unique event name
   * @param fn Module event function
   */
  public onCompletion(eventName: string, fn: ModuleEventFn): void {
    this._moduleEvents.onCompletion[eventName] = {
      name: eventName,
      eventType: EventType.ON_COMPLETION,
      fn,
    };
  }

  /**
   * OnSuccess module event is run only if module execution is successfully finished.
   *
   * @param eventName Unique event name
   * @param fn Module event function
   */
  public onSuccess(eventName: string, fn: ModuleEventFn): void {
    this._moduleEvents.onSuccess[eventName] = {
      name: eventName,
      eventType: EventType.ON_SUCCESS,
      fn,
    };
  }

  /**
   * OnFail module event is run only if module execution errored or failed for any other reason.
   *
   * @param eventName Unique event name
   * @param fn Module event function
   */
  public onFail(eventName: string, fn: ModuleEventFn): void {
    this._moduleEvents.onFail[eventName] = {
      name: eventName,
      eventType: EventType.ON_FAIL,
      fn,
    };
  }
}

export class Template {
  public contractName: string;

  constructor(contractName: string) {
    this.contractName = contractName;
  }
}

export class Module {
  public readonly name: string;
  private readonly _isUsage: boolean = false;

  private _initialized: boolean = false;
  private readonly _fn: ModuleBuilderFn;
  private _params: ModuleParams;
  private _bindings: { [name: string]: ContractBinding };
  private _events: Events;
  private _moduleEvents: ModuleEvents;
  private _actions: { [name: string]: Action };
  private readonly _moduleConfig: ModuleConfig | undefined;
  private _templates: { [name: string]: Template };

  private _gasPriceProvider: IGasPriceCalculator | undefined;
  private _nonceManager: INonceManager | undefined;
  private _transactionSigner: ITransactionSigner | undefined;

  constructor(
    moduleName: string,
    fn: ModuleBuilderFn,
    moduleConfig: ModuleConfig | undefined,
    usageModule: boolean = false
  ) {
    this.name = moduleName;
    this._fn = fn;
    this._moduleConfig = moduleConfig;
    this._isUsage = usageModule;

    this._params = moduleConfig?.defaultOptions?.params ?? {};
    this._bindings = {};
    this._events = {};
    this._moduleEvents = {
      onFail: {},
      onCompletion: {},
      onStart: {},
      onSuccess: {},
    };
    this._actions = {};
    this._templates = {};
  }

  public isInitialized(): boolean {
    return this._initialized;
  }

  public async init(
    moduleSession: Namespace,
    extractor: IContractDataExtractor,
    moduleValidator: IModuleValidator,
    signers: ethers.Signer[],
    m?: ModuleBuilder,
    moduleParams?: ModuleParams
  ): Promise<ModuleBuilder> {
    if (moduleParams !== undefined && checkIfExist(moduleParams)) {
      this._params = moduleParams;
    }
    let moduleBuilder =
      m ??
      new ModuleBuilder(
        moduleSession,
        extractor,
        moduleValidator,
        moduleParams
      );
    if (moduleParams !== undefined) {
      moduleBuilder.setParam(moduleParams);
    }

    // this is needed in order for ContractBindings to be aware of their originating module for later context changes
    if (m !== undefined) {
      const currentDepth =
        moduleSession.get(ClsNamespaces.MODULE_DEPTH_NAME) ?? [];
      currentDepth.push(this.name);

      moduleSession.set(ClsNamespaces.MODULE_DEPTH_NAME, currentDepth);
    } else {
      moduleSession.set(ClsNamespaces.MODULE_NAME, this.name);
    }

    try {
      await this._fn(moduleBuilder, signers);
    } catch (err) {
      if (err._isUserError || err._isCliError) {
        throw err;
      }

      throw new DeploymentFileError(err);
    }
    moduleBuilder = await handleModule(
      moduleBuilder,
      extractor,
      moduleValidator,
      this.name,
      this._isUsage,
      m !== undefined
    );

    this._bindings = moduleBuilder.getAllBindings();
    this._events = moduleBuilder.getAllEvents();
    this._moduleEvents = moduleBuilder.getAllModuleEvents();
    this._actions = moduleBuilder.getAllActions();
    this._gasPriceProvider = moduleBuilder.getCustomGasPriceProvider();
    this._nonceManager = moduleBuilder.getCustomNonceManager();
    this._transactionSigner = moduleBuilder.getCustomTransactionSigner();
    this._templates = moduleBuilder.getAllTemplates();
    this._params = moduleBuilder.getAllParams();

    this._initialized = true;

    return moduleBuilder;
  }

  public getAllBindings(): { [name: string]: ContractBinding } {
    return this._bindings;
  }

  public getAllEvents(): Events {
    return this._events;
  }

  public getParams(): ModuleParams {
    return this._params;
  }

  public getAllModuleEvents(): ModuleEvents {
    return this._moduleEvents;
  }

  public getAllActions(): { [name: string]: Action } {
    return this._actions;
  }

  public getAction(name: string): Action {
    return this._actions[name];
  }

  public getModuleConfig(): ModuleConfig | undefined {
    return this._moduleConfig;
  }

  public getAllTemplates(): { [name: string]: Template } {
    return this._templates;
  }

  public getCustomGasPriceProvider(): IGasPriceCalculator | undefined {
    return this._gasPriceProvider;
  }

  public getCustomNonceManager(): INonceManager | undefined {
    return this._nonceManager;
  }

  public getCustomTransactionSigner(): ITransactionSigner | undefined {
    return this._transactionSigner;
  }
}

function checkIfSuitableForInstantiating(
  contractBinding: ContractBinding
): boolean {
  return (
    checkIfExist(contractBinding?.deployMetaData.contractAddress) &&
    checkIfExist(contractBinding?.abi) &&
    checkIfExist(contractBinding?.signer) &&
    checkIfExist(contractBinding?.prompter) &&
    checkIfExist(contractBinding?.txGenerator) &&
    checkIfExist(contractBinding?.moduleStateRepo)
  );
}

export async function handleModule(
  moduleBuilder: ModuleBuilder,
  compiler: IContractDataExtractor,
  moduleValidator: IModuleValidator,
  moduleName: string,
  isUsage: boolean,
  _isSubModule: boolean
): Promise<ModuleBuilder> {
  const contractBuildNames: string[] = [];
  const moduleBuilderBindings = moduleBuilder.getAllBindings();
  for (const [, bind] of Object.entries(moduleBuilderBindings)) {
    contractBuildNames.push(bind.contractName);
  }

  const bytecodes: { [name: string]: string } = compiler.extractBytecode(
    contractBuildNames
  );
  const abi: {
    [name: string]: JsonFragment[];
  } = compiler.extractContractInterface(contractBuildNames);
  const libraries: LinkReferences = compiler.extractContractLibraries(
    contractBuildNames
  );

  if (!isUsage) {
    moduleValidator.validate(moduleBuilderBindings, abi);
  }

  for (const [bindingName, binding] of Object.entries(moduleBuilderBindings)) {
    if (
      (bytecodes !== undefined &&
        !checkIfExist(bytecodes[binding.contractName])) ||
      (libraries !== undefined &&
        !checkIfExist(libraries[binding.contractName]))
    ) {
      throw new MissingContractMetadata(binding.contractName);
    }

    moduleBuilderBindings[bindingName].bytecode =
      bytecodes[binding.contractName];
    if (libraries !== undefined) {
      moduleBuilderBindings[bindingName].libraries =
        libraries[binding.contractName];
    }

    if (abi !== undefined) {
      moduleBuilderBindings[bindingName].abi = abi[binding.contractName];
    }
  }

  return moduleBuilder;
}
