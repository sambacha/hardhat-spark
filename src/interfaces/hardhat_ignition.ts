import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { HardhatCompiler } from '../packages/ethereum/compiler/hardhat';
import {
  checkIfExist,
  checkIfSameInputs,
  checkIfSuitableForInstantiating, compareBytecode
} from '../packages/utils/util';
import { ModuleValidator } from '../packages/modules/module_validator';
import { JsonFragment, JsonFragmentType } from '../packages/types/artifacts/abi';
import { TransactionReceipt, TransactionRequest, TransactionResponse } from '@ethersproject/abstract-provider';
import { cli } from 'cli-ux';
import { CallOverrides, ethers } from 'ethers';
import { ContractFunction } from '@ethersproject/contracts/src.ts/index';
import { FunctionFragment } from '@ethersproject/abi';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import { IPrompter } from '../packages/utils/promter';
import { BLOCK_CONFIRMATION_NUMBER } from '../packages/ethereum/transactions/executor';
import { BindingsConflict, CliError, PrototypeNotFound, UserError } from '../packages/types/errors';
import { IModuleRegistryResolver } from '../packages/modules/states/registry';
import { LinkReferences, SingleContractLinkReference } from '../packages/types/artifacts/libraries';
import { IGasCalculator, IGasPriceCalculator } from '../packages/ethereum/gas';
import { INonceManager, ITransactionSigner } from '../packages/ethereum/transactions';
import { EventTxExecutor } from '../packages/ethereum/transactions/event_executor';
import { Namespace } from 'cls-hooked';
import { Deferrable } from '@ethersproject/properties';
import { clsNamespaces } from '../packages/utils/continuation_local_storage';

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
export type NamedArguments = { [name: string]: AutoBinding };

// Arguments is the final type that wraps the Arguments above
// and is the type that is directly used by Bindings and Actions.
export type Arguments = Argument[];

export type ActionFn = (...args: any[]) => void;

export type RedeployFn = (...deps: ContractBinding[]) => Promise<void>;

export type EventFnDeployed = () => Promise<void>;
export type EventFnCompiled = () => void;
export type EventFn = () => void;
export type ModuleEventFn = () => Promise<void>;

export type ShouldRedeployFn = (curr: ContractBinding) => boolean;

export type DeployReturn = {
  transaction: TransactionReceipt,
  contractAddress: string,
};
export type DeployFn = () => Promise<DeployReturn>;

export enum EventType {
  'OnChangeEvent' = 'OnChangeEvent',
  'BeforeDeploymentEvent' = 'BeforeDeploymentEvent',
  'AfterDeploymentEvent' = 'AfterDeploymentEvent',
  'BeforeDeployEvent' = 'BeforeDeployEvent',
  'AfterDeployEvent' = 'AfterDeployEvent',
  'AfterCompileEvent' = 'AfterCompileEvent',
  'BeforeCompileEvent' = 'BeforeCompileEvent',
  'OnStart' = 'OnStart',
  'OnFail' = 'OnFail',
  'OnCompletion' = 'OnCompletion',
  'OnSuccess' = 'OnSuccess',
  'Deploy' = 'Deploy',
}

export type BaseEvent = {
  name: string,
  eventType: EventType,

  // contract dependencies
  deps: string[],
  // event dependencies
  eventDeps: string[],

  usage: string[],
  eventUsage: string[],
};

export interface BeforeDeployEvent extends BaseEvent {
  fn: EventFnCompiled;
}

export interface BeforeDeploymentEvent extends BaseEvent {
  fn: EventFnCompiled;
}

export interface AfterDeployEvent extends BaseEvent {
  fn: EventFnDeployed;
}

export interface AfterDeploymentEvent extends BaseEvent {
  fn: EventFnDeployed;
}

export interface BeforeCompileEvent extends BaseEvent {
  fn: EventFn;
}

export interface AfterCompileEvent extends BaseEvent {
  fn: EventFnCompiled;
}

export interface OnChangeEvent extends BaseEvent {
  fn: RedeployFn;
}

export type ModuleEvent = { name: string, eventType: EventType, fn: ModuleEventFn };

export type MetaDataEvent = { name: string, eventType: EventType, deps?: string[], eventDeps?: string[], usage?: string[], eventUsage?: string[] };

export type ContractEvent =
  BeforeDeployEvent |
  AfterDeployEvent |
  AfterDeploymentEvent |
  BeforeDeploymentEvent |
  BeforeCompileEvent |
  AfterCompileEvent |
  OnChangeEvent;

export type Event = ContractEvent | ModuleEvent | MetaDataEvent;

export type Events = { [name: string]: StatefulEvent };

export type ModuleEvents = {
  onStart: { [name: string]: ModuleEvent },
  onSuccess: { [name: string]: ModuleEvent },
  onCompletion: { [name: string]: ModuleEvent },
  onFail: { [name: string]: ModuleEvent },
};

export type EventsDepRef = {
  beforeCompile: string[]
  afterCompile: string[]
  beforeDeployment: string[]
  afterDeployment: string[]
  beforeDeploy: string[]
  afterDeploy: string[]
  onChange: string[]
};

export type Deployed = {
  lastEventName: string | undefined,
  logicallyDeployed: boolean | undefined,
  contractAddress: string | undefined,
  shouldRedeploy: ShouldRedeployFn | undefined,
  deploymentSpec: {
    deployFn: DeployFn | undefined,
    deps: (ContractBinding | ContractBindingMetaData | ContractEvent)[]
  } | undefined,
};

/**
 * Module config is simple way to specify if desired contract should be deployed or not.
 */
export type ModuleConfig = {
  [contractName: string]: {
    deploy: boolean
  }
};

export type FactoryCustomOpts = {
  getterFunc?: string,
  getterArgs?: any[]
};

export class StatefulEvent {
  public _isStatefulEvent: boolean = true;

  public event: Event;
  public moduleName: string;
  public executed: boolean;
  public txData: { [bindingName: string]: EventTransactionData };

  constructor(event: Event, executed: boolean, txData: { [bindingName: string]: EventTransactionData }) {
    this.event = event;
    this.executed = executed;
    this.txData = txData;
  }
}

export type ModuleOptions = {
  // Module parameters used to customize Module behavior.
  params: { [name: string]: any }
};

export type ModuleBuilderFn = (m: ModuleBuilder | any, wallets?: ethers.Wallet[]) => Promise<void>;

export abstract class Binding {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  instance(m: ModuleBuilder): any {
    return {
      name: this.name
    };
  }
}

export type SearchParams = {
  functionName?: string;
};

export class GroupedDependencies {
  dependencies: (ContractBinding | ContractEvent)[];

  constructor(dependencies: (ContractBinding | ContractEvent)[]) {
    this.dependencies = dependencies;
  }

  // util
  find(searchParams: SearchParams): GroupedDependencies {
    const bindings = this.dependencies.filter((target: ContractBinding | ContractEvent) => {
        return ((target as ContractBinding)?.abi as JsonFragment[]).find(({name}) => name === searchParams?.functionName);
      }
    ) as ContractBinding[];

    return new GroupedDependencies(bindings);
  }

  exclude(...elementName: string[]): GroupedDependencies {
    const newBindings = this.dependencies.filter((target) => {
      const fullExpr = new RegExp(elementName
        .map((elementName: string) => elementName)
        .join('|')
      );

      return !fullExpr.test(target.name);
    });

    return new GroupedDependencies(newBindings);
  }

  map(fn: (value: ContractBinding, index: number, array: (ContractBinding | ContractEvent)[]) => any): (ContractBinding | ContractEvent)[] {
    const resultArray = [];
    for (let index = 0; index < this.dependencies.length; index++) {
      resultArray.push(fn(this.dependencies[index] as ContractBinding, index, this.dependencies));
    }

    return resultArray;
  }

  shouldRedeploy(fn: ShouldRedeployFn): void {
    for (let dependency of this.dependencies) {
      dependency = dependency as ContractBinding;
      if (dependency._isContractBinding) {
        if (dependency.deployMetaData.shouldRedeploy) {
          throw new UserError('Should redeploy function is already set.');
        }

        dependency.deployMetaData.shouldRedeploy = fn;
      }
    }
  }

  // event hooks
  beforeDeployment(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['BeforeDeploymentEvent'], this.dependencies, usages);
    const beforeDeployment: BeforeDeploymentEvent = {
      ...generateBaseEvent,
      fn,
    };

    for (let dep of this.dependencies) {
      dep = dep as ContractBinding;
      if (dep._isContractBinding) {
        if (dep.eventsDeps.beforeDeployment.includes(eventName)) {
          continue;
        }

        dep.eventsDeps.beforeDeployment.push(eventName);
      }
    }

    m.addEvent(eventName, beforeDeployment);
    return beforeDeployment;
  }

  // afterDeployment executes each time after a deployment has finished.
  // The deployment doesn't actually have to perform any deployments for this event to trigger.
  afterDeployment(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['AfterDeploymentEvent'], this.dependencies, usages);
    const afterDeployment: AfterDeploymentEvent = {
      ...generateBaseEvent,
      fn,
    };

    for (let dep of this.dependencies) {
      dep = dep as ContractBinding;
      if (dep._isContractBinding) {
        if (dep.eventsDeps.afterDeployment.includes(eventName)) {
          continue;
        }

        dep.eventsDeps.afterDeployment.push(eventName);
      }
    }

    m.addEvent(eventName, afterDeployment);
    return afterDeployment;
  }

  // beforeDeploy runs each time the Binding is about to be triggered.
  // This event can be used to force the binding in question to be deployed.
  beforeDeploy(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['BeforeDeployEvent'], this.dependencies, usages);
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
  afterDeploy(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['AfterDeployEvent'], this.dependencies, usages);
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
  beforeCompile(m: ModuleBuilder, eventName: string, fn: EventFn, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['BeforeCompileEvent'], this.dependencies, usages);
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
  afterCompile(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['AfterCompileEvent'], this.dependencies, usages);
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
  onChange(m: ModuleBuilder, eventName: string, fn: RedeployFn, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['OnChangeEvent'], this.dependencies, usages);
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
  public _isContractBinding: boolean = true;

  public contractName: string;
  public args: Arguments;
  public eventsDeps: EventsDepRef;
  public deployMetaData: Deployed;

  public moduleName: string;

  public bytecode: string | undefined;
  public abi: JsonFragment[] | undefined;
  public library: boolean = false;
  public libraries: SingleContractLinkReference | undefined;

  public txData: TransactionData | undefined;
  public contractTxProgress: number | undefined;

  private contractInstance: ethers.Contract | undefined;

  public wallet: ethers.Wallet | undefined;
  public forceFlag: boolean;

  public signer: ethers.Signer | undefined;
  public prompter: IPrompter | undefined;
  public txGenerator: EthTxGenerator | undefined;
  public moduleStateRepo: ModuleStateRepo | undefined;
  public eventTxExecutor: EventTxExecutor | undefined;
  public eventSession: Namespace | undefined;

  constructor(
    // metadata
    name: string, contractName: string, args: Arguments, moduleName: string,
    bytecode?: string, abi?: JsonFragment[], libraries?: SingleContractLinkReference, deployMetaData?: Deployed, txData?: TransactionData,
    // event hooks
    events?: EventsDepRef,
    signer?: ethers.Signer,
    prompter?: IPrompter,
    txGenerator?: EthTxGenerator,
    moduleStateRepo?: ModuleStateRepo,
    eventTxExecutor?: EventTxExecutor,
    eventSession?: Namespace
  ) {
    super(name);
    this.args = args;
    this.contractName = contractName;
    this.deployMetaData = deployMetaData || {
      logicallyDeployed: undefined,
      contractAddress: undefined,
      lastEventName: undefined,
      shouldRedeploy: undefined,
      deploymentSpec: {
        deployFn: undefined,
        deps: []
      },
    };
    this.eventsDeps = events || {
      beforeCompile: [],
      afterCompile: [],
      beforeDeployment: [],
      afterDeployment: [],
      beforeDeploy: [],
      afterDeploy: [],
      onChange: []
    };

    this.bytecode = bytecode;
    this.abi = abi;
    this.libraries = libraries;

    this.txData = txData;
    this.contractTxProgress = 0;

    this.contractInstance = undefined;

    this.signer = signer;
    this.prompter = prompter;
    this.txGenerator = txGenerator;
    this.moduleStateRepo = moduleStateRepo;
    this.eventTxExecutor = eventTxExecutor;
    this.eventSession = eventSession;

    this.forceFlag = false;
    this.moduleName = moduleName;
  }

  /**
   * This is only available to be called inside event hook function execution.
   *
   * This function is instantiating wrapped ether.Contract. It has all ether.Contract functionality, as shown in
   * interface, with record keeping functionality. This is needed in case if some of underlying contract function
   * fail in execution so when hardhat-ignition continue it will "skip" successfully executed transaction.
   */
  instance(): ethers.Contract {
    if (this.contractInstance) {
      return this.contractInstance;
    }

    if (!checkIfSuitableForInstantiating(this)) {
      throw new UserError('Binding is not suitable to be instantiated, please deploy it first');
    }

    this.contractInstance = new ContractInstance(
      this,
      this.deployMetaData?.contractAddress as string,
      this.abi as JsonFragment[],
      this.signer as ethers.Signer,
      this.prompter as IPrompter,
      this.txGenerator as EthTxGenerator,
      this.moduleStateRepo as ModuleStateRepo,
      this.eventTxExecutor as EventTxExecutor,
      this.eventSession as Namespace,
    ) as unknown as ethers.Contract;

    return this.contractInstance;
  }

  /**
   * Sets custom contract deployer. This means that `wallet` is going to sing contract creation transaction.
   *
   * @param wallet Ethers wallet object referencing deployer.
   */
  setDeployer(wallet: ethers.Wallet): ContractBinding {
    this.wallet = wallet;

    return this;
  }

  /**
   * Flag provided in case user wants to force contract deployment even if contract is already has record in state file.
   */
  force(): ContractBinding {
    this.forceFlag = true;

    return this;
  }

  /**
   * Ability for hot-swapping contract bytecode in case of any on-fly changes by user.
   *
   * @param bytecode New contract bytecode.
   */
  changeBytecode(bytecode: string) {
    this.bytecode = bytecode;
  }

  /**
   * Run hardhat compiler on top of whole project, most commonly used if their is on fly contract source changes.
   */
  recompile() {
    const compiler = new HardhatCompiler();

    compiler.compile();
  }

  /**
   * Fetching bytecode, abi and libraries metadata from artifacts and injecting them into contract object inside module
   * builder for use.
   */
  fetchAllContractMetadata() {
    const compiler = new HardhatCompiler();

    this.bytecode = compiler.extractBytecode([this.contractName])[this.contractName];
    this.abi = compiler.extractContractInterface([this.contractName])[this.contractName];
    this.libraries = compiler.extractContractLibraries([this.contractName])[this.contractName];
  }

  /**
   * This functions is setting library flag to true, in order for hardhat-ignition to know how to resolve library usage.
   */
  setLibrary() {
    this.library = true;
  }

  /**
   * This is helper function that is setting new logic contract for proxy.
   *
   * @param m ModuleBuilder object
   * @param proxy Proxy contract instance
   * @param logic Logic contract instance
   * @param setLogicFuncName Function used to change logic contract in proxy
   */
  proxySetNewLogic(m: ModuleBuilder, proxy: ContractBinding, logic: ContractBinding, setLogicFuncName: string): void {
    m.group(proxy, logic).afterDeploy(m, `setNewLogicContract${proxy.name}${logic.name}`, async () => {
      await proxy.instance()[setLogicFuncName](logic);
    });
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
  factoryCreate(m: ModuleBuilder, childName: string, createFuncName: string, args: any[], opts?: FactoryCustomOpts): ContractBinding {
    const getFunctionName = opts.getterFunc ? opts.getterFunc : 'get' + createFuncName.substr(5);
    const getFunctionArgs = opts.getterArgs ? opts.getterArgs : [];

    const child = m.contract(childName);
    child.deployFn(async () => {
      const tx = await this.instance()[createFuncName](...args);

      const children = await this.instance()[getFunctionName](getFunctionArgs);

      return {
        transaction: tx,
        contractAddress: children[0]
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
  deployFn(deployFn: DeployFn, ...deps: ContractBinding[]): ContractBinding {
    this.deployMetaData.deploymentSpec = {
      deployFn,
      deps
    };

    return this;
  }

  /**
   * Setup beforeDeployment event hook on desired contract.
   *
   * It is running always before contract deployment, this means that even if contract is already deployed and their is
   * record in hardhat-ignition state file, the function would be executed.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeployment -> beforeDeploy -> onChange -> afterDeploy
   * -> afterDeployment -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn Function to be executed before contract deployment.
   * @param usages Usage contracts.
   */
  beforeDeployment(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeDeployment.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }
    this.eventsDeps.beforeDeployment.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['BeforeDeploymentEvent'], [this], usages);

    const beforeDeployment: BeforeDeploymentEvent = {
      ...generateBaseEvent,
      fn,
    };
    m.addEvent(eventName, beforeDeployment);

    return beforeDeployment;
  }

  /**
   * Setup afterDeployment event hook. It is running always before contract deployment, this means that even if contract
   * is already deployed and their is record in hardhat-ignition state file, the function would be executed.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeployment -> beforeDeploy -> onChange -> afterDeploy
   * -> afterDeployment -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn Function that is going to be executed immediately after contract deployment.
   * @param usages Usage contracts.
   */
  afterDeployment(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.afterDeployment.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }
    this.eventsDeps.afterDeployment.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['AfterDeploymentEvent'], [this], usages);

    const afterDeploymentEvent: AfterDeploymentEvent = {
      ...generateBaseEvent,
      fn,
    };
    m.addEvent(eventName, afterDeploymentEvent);

    return afterDeploymentEvent;
  }

  /**
   * Before deploy event hook. It is running only if contract that event is bounded to this event is actually going to
   * be deployed.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeployment -> beforeDeploy -> onChange -> afterDeploy
   * -> afterDeployment -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn
   * @param usages
   */
  beforeDeploy(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }
    this.eventsDeps.beforeDeploy.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['BeforeDeployEvent'], [this], usages);

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
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeployment -> beforeDeploy -> onChange -> afterDeploy
   * -> afterDeployment -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object
   * @param eventName Unique event name
   * @param fn
   * @param usages
   */
  afterDeploy(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.afterDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }
    this.eventsDeps.afterDeploy.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['AfterDeployEvent'], [this], usages);

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
  shouldRedeploy(fn: ShouldRedeployFn): void {
    this.deployMetaData.shouldRedeploy = fn;
  }

  /**
   *  Before compile event hook. Runs immediately before compile.
   *
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeployment -> beforeDeploy -> onChange -> afterDeploy
   * -> afterDeployment -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn
   * @param usages
   */
  beforeCompile(m: ModuleBuilder, eventName: string, fn: EventFn, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeCompile.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }
    this.eventsDeps.beforeCompile.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['BeforeCompileEvent'], [this], usages);

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
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeployment -> beforeDeploy -> onChange -> afterDeploy
   * -> afterDeployment -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn
   * @param usages
   */
  afterCompile(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.afterCompile.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }
    this.eventsDeps.afterCompile.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['AfterCompileEvent'], [this], usages);

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
   * Event lifecycle: beforeCompile -> afterCompile -> beforeDeployment -> beforeDeploy -> onChange -> afterDeploy
   * -> afterDeployment -> onCompletion -> onSuccess -> onError
   *
   * @param m ModuleBuilder object.
   * @param eventName Unique event name.
   * @param fn
   * @param usages
   */
  onChange(m: ModuleBuilder, eventName: string, fn: RedeployFn, ...usages: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.onChange.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }
    this.eventsDeps.onChange.push(eventName);

    const generateBaseEvent = ContractBinding.generateBaseEvent(eventName, EventType['OnChangeEvent'], [this], usages);

    const onChangeEvent: OnChangeEvent = {
      ...generateBaseEvent,
      fn,
    };
    m.addEvent(eventName, onChangeEvent);

    return onChangeEvent;
  }

  public static generateBaseEvent(eventName: string, eventType: EventType, dependencies: (ContractBinding | ContractEvent)[], usages: (ContractBinding | ContractEvent)[]): BaseEvent {
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
    for (let i = 0; i < dependencies.length; i++) {
      const dep = dependencies[i];
      if ((dep as ContractBinding)._isContractBinding) {
        depBindings.push(dep.name);
      } else {
        depEvents.push((dep as ContractEvent).name);
      }
    }

    return {
      name: eventName,
      eventType: eventType,
      deps: depBindings,
      eventDeps: depEvents,
      usage: usageBindings,
      eventUsage: eventUsages,
    };
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

type TxData = {
  from: string
  input: string
};

export type ContractInput = {
  functionName: string
  inputs: JsonFragmentType[]
};

export type TransactionData = {
  input: TxData | TransactionResponse | undefined
  output: TransactionReceipt | undefined
};

export type EventTransactionData = {
  contractInput: (ContractInput | TransactionRequest)[]
  contractOutput: TransactionResponse[]
};

export class ContractInstance {
  private readonly contractBinding: ContractBinding;
  private readonly prompter: IPrompter;
  private readonly moduleStateRepo: ModuleStateRepo;
  private readonly eventTxExecutor: EventTxExecutor;
  private readonly eventSession: Namespace;
  private readonly txGenerator: EthTxGenerator;

  private signer: ethers.Signer;

  [key: string]: any;

  constructor(
    contractBinding: ContractBinding,
    contractAddress: string,
    abi: JsonFragment[],
    signer: ethers.Signer,
    prompter: IPrompter,
    txGenerator: EthTxGenerator,
    moduleStateRepo: ModuleStateRepo,
    eventTxExecutor: EventTxExecutor,
    eventSession: Namespace,
  ) {
    this.prompter = prompter;
    this.txGenerator = txGenerator;
    this.contractBinding = contractBinding;
    this.eventTxExecutor = eventTxExecutor;
    this.eventSession = eventSession;
    this.signer = signer;

    if (!checkIfExist(this.contractBinding?.contractTxProgress)) {
      this.contractBinding.contractTxProgress = 0;
    }

    this.moduleStateRepo = moduleStateRepo;
    const parent: any = new ethers.Contract(contractAddress, abi, signer);

    Object.keys(parent.interface.functions).forEach((signature) => {
      const fragment = parent.interface.functions[signature];

      if (parent[signature] != undefined) {
        if (fragment.constant) {
          this[signature] = this.buildConstantWrappers(parent[signature], fragment);
          this[fragment.name] = this[signature];
          return;
        }

        this[signature] = this.buildDefaultWrapper(parent[signature], fragment);
        this[fragment.name] = this[signature];
      }
    });

    Object.keys(parent.interface.structs).forEach((fragment) => {
      const struct = parent.interface.structs[fragment];

      if (struct != undefined) {
        this[fragment] = this.buildStructWrappers(parent[fragment]);
        this[fragment] = this[fragment];
        return;
      }
    });

    Object.keys(parent).forEach((key) => {
      if (this[key] != undefined) {
        return;
      }

      this[key] = parent[key];
    });
  }

  private buildDefaultWrapper(contractFunction: ContractFunction, fragment: FunctionFragment): ContractFunction {
    return async (...args: Array<any>): Promise<TransactionResponse> => {
      const func = async function (...args: Array<any>): Promise<TransactionResponse> {
        const sessionEventName = this.eventSession.get(clsNamespaces.EVENT_NAME);
        if (args.length > fragment.inputs.length + 1) {
          throw new UserError(`Trying to call contract function with more arguments then in interface - ${fragment.name}`);
        }

        if (args.length < fragment.inputs.length) {
          throw new UserError(`Trying to call contract function with less arguments then in interface - ${fragment.name}`);
        }

        let overrides: CallOverrides = {};
        if (args.length === fragment.inputs.length + 1) {
          overrides = args.pop() as CallOverrides;
        }

        args = ContractInstance.formatArgs(args);

        let contractTxIterator = this.contractBinding?.contractTxProgress || 0;

        const currentEventTransactionData = await this.moduleStateRepo.getEventTransactionData(this.contractBinding.name, sessionEventName);

        if (currentEventTransactionData.contractOutput.length > contractTxIterator) {
          this.contractBinding.contractTxProgress = ++contractTxIterator;
          return currentEventTransactionData.contractOutput[contractTxIterator - 1];
        }

        const currentInputs = currentEventTransactionData.contractInput[contractTxIterator];
        const contractOutput = currentEventTransactionData.contractOutput[contractTxIterator];

        if (checkIfExist(currentInputs) &&
          checkIfSameInputs(currentInputs, fragment.name, args) && checkIfExist(contractOutput)) {
          cli.info('Contract function already executed: ', fragment.name, ...args, '... skipping');

          this.contractBinding.contractTxProgress = ++contractTxIterator;
          return contractOutput;
        }

        if (
          (checkIfExist(currentInputs) && !checkIfSameInputs(currentInputs, fragment.name, args)) ||
          !checkIfExist(currentInputs)
        ) {
          currentEventTransactionData.contractInput[contractTxIterator] = {
            functionName: fragment.name,
            inputs: args,
          } as ContractInput;
        }

        this.prompter.executeContractFunction(fragment.name);
        await this.prompter.promptExecuteTx();

        const txData = await this.txGenerator.fetchTxData(await this.signer.getAddress());
        overrides = {
          gasPrice: overrides.gasPrice ? overrides.gasPrice : txData.gasPrice,
          value: overrides.value ? overrides.value : undefined,
          gasLimit: overrides.gasLimit ? overrides.gasLimit : undefined,
          nonce: txData.nonce,
        };

        await this.prompter.sendingTx(sessionEventName, fragment.name);
        const tx = await contractFunction(...args, overrides);
        await this.prompter.sentTx(sessionEventName, fragment.name);

        this.prompter.waitTransactionConfirmation();
        if (!this.eventSession.get(clsNamespaces.PARALLELIZE)) {
          const txReceipt = await tx.wait(BLOCK_CONFIRMATION_NUMBER);
          await this.moduleStateRepo.storeEventTransactionData(this.contractBinding.name, currentEventTransactionData.contractInput[contractTxIterator], txReceipt, sessionEventName);
          this.prompter.transactionConfirmation(BLOCK_CONFIRMATION_NUMBER, sessionEventName, fragment.name);
        }

        this.contractBinding.contractTxProgress = ++contractTxIterator;

        this.prompter.finishedExecutionOfContractFunction(fragment.name);

        return tx;
      }.bind(this);

      const currentEventAbstraction = this.eventSession.get(clsNamespaces.EVENT_NAME);
      const txSender = await this.signer.getAddress();
      this.eventTxExecutor.add(currentEventAbstraction, txSender, func);

      return await this.eventTxExecutor.executeSingle(currentEventAbstraction, ...args);
    };
  }

  private buildConstantWrappers(contractFunction: ContractFunction, fragment: FunctionFragment): ContractFunction {
    return async (...args: Array<any>): Promise<TransactionResponse> => {
      args = ContractInstance.formatArgs(args);

      return await contractFunction(...args);
    };
  }

  private buildStructWrappers(struct: any): any {
    return async (...args: Array<any>): Promise<TransactionResponse> => {
      args = ContractInstance.formatArgs(args);

      return await struct(...args);
    };
  }

  private static formatArgs(args: Array<any>): Array<any> {
    let i = 0;
    for (let arg of args) {
      if (checkIfExist(arg?.contractName) && !checkIfExist(arg?.deployMetaData.contractAddress)) {
        throw new UserError(`You are trying to use contract that is not deployed ${arg.name}`);
      }

      if (checkIfExist(arg?.deployMetaData?.contractAddress)) {
        arg = arg as ContractBinding;

        args[i] = arg.deployMetaData.contractAddress;
      }

      i++;
    }

    return args;
  }

  public setNewSigner(wallet: ethers.Wallet) {
    if (wallet._isSigner) {
      this.signer = wallet as ethers.Signer;
    }
  }
}

export class IgnitionWallet extends ethers.Wallet {
  private sessionNamespace: Namespace;
  private moduleStateRepo: ModuleStateRepo;
  private nonceManager: INonceManager;
  private gasPriceCalculator: IGasPriceCalculator;
  private gasCalculator: IGasCalculator;
  private prompter: IPrompter;
  private eventTxExecutor: EventTxExecutor;

  constructor(
    wallet: ethers.Wallet,
    sessionNamespace: Namespace,
    nonceManager: INonceManager,
    gasPriceCalculator: IGasPriceCalculator,
    gasCalculator: IGasCalculator,
    moduleStateRepo: ModuleStateRepo,
    prompter: IPrompter,
    eventTxExecutor: EventTxExecutor
  ) {
    super(wallet.privateKey, wallet.provider);

    this.sessionNamespace = sessionNamespace;
    this.nonceManager = nonceManager;
    this.gasPriceCalculator = gasPriceCalculator;
    this.gasCalculator = gasCalculator;
    this.moduleStateRepo = moduleStateRepo;
    this.prompter = prompter;
    this.eventTxExecutor = eventTxExecutor;
  }

  async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<TransactionResponse> {
    const func = async (): Promise<TransactionResponse> => {
      const toAddr = await transaction.to;
      await this.prompter.executeWalletTransfer(this.address, toAddr);
      const currentEventName = this.sessionNamespace.get(clsNamespaces.EVENT_NAME);
      if (!checkIfExist(currentEventName)) {
        throw new UserError('Wallet function is running outside event!');
      }

      await this.prompter.sendingTx(currentEventName, 'raw wallet transaction');

      const ignitionTransaction = await this.populateTransactionWithIgnitionMetadata(transaction);

      const txResp = await super.sendTransaction(ignitionTransaction);
      await this.prompter.sentTx(currentEventName, 'raw wallet transaction');

      if (!this.sessionNamespace.get(clsNamespaces.PARALLELIZE)) {
        this.prompter.waitTransactionConfirmation();
        const txReceipt = await txResp.wait(BLOCK_CONFIRMATION_NUMBER);
        this.prompter.transactionConfirmation(BLOCK_CONFIRMATION_NUMBER, currentEventName, 'raw wallet transaction');
      }

      await this.moduleStateRepo.storeEventTransactionData(this.address, ignitionTransaction, txResp, currentEventName);

      await this.prompter.finishedExecutionOfWalletTransfer(this.address, toAddr);

      return txResp;
    };

    const currentEventName = this.sessionNamespace.get(clsNamespaces.EVENT_NAME);
    this.eventTxExecutor.add(currentEventName, this.address, func);

    return this.eventTxExecutor.executeSingle(currentEventName);
  }

  private async populateTransactionWithIgnitionMetadata(transaction: Deferrable<TransactionRequest>): Promise<TransactionRequest> {
    if (!checkIfExist(transaction.nonce)) {
      transaction.nonce = this.nonceManager.getAndIncrementTransactionCount(this.address);
    }

    if (!checkIfExist(transaction.gasPrice)) {
      transaction.gasPrice = this.gasPriceCalculator.getCurrentPrice();
    }

    if (!checkIfExist(transaction.gasPrice)) {
      const toAddr = await transaction.to;
      const data = await transaction.data;

      transaction.gasLimit = await this.gasCalculator.estimateGas(
        this.address,
        toAddr || undefined,
        data
      );
    }

    return await super.populateTransaction(transaction);
  }
}

export class ContractBindingMetaData {
  public _isContractBindingMetaData: boolean = true;

  public name: string;
  public contractName: string;
  public args: Arguments;
  public bytecode: string | undefined;
  public abi: JsonFragment[] | undefined;
  public libraries: SingleContractLinkReference | undefined;
  public txData: TransactionData | undefined;
  public deployMetaData: Deployed;

  public library: boolean = false;

  constructor(name: string, contractName: string, args: Arguments, bytecode?: string, abi?: JsonFragment[], library?: boolean, libraries?: SingleContractLinkReference, txData?: TransactionData, deployMetaData?: Deployed) {
    this.name = name;
    this.contractName = contractName;
    this.args = args;
    this.bytecode = bytecode;
    this.abi = abi;
    this.library = library;
    this.libraries = libraries;
    this.txData = txData;
    this.deployMetaData = deployMetaData || {
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

  private opts: ModuleOptions;
  private readonly bindings: { [name: string]: ContractBinding };
  private readonly contractEvents: Events;
  private readonly moduleEvents: ModuleEvents;
  private readonly actions: { [name: string]: Action };
  private prototypes: { [name: string]: Prototype };

  private resolver: IModuleRegistryResolver | undefined;
  private registry: IModuleRegistryResolver | undefined;
  private gasPriceProvider: IGasPriceCalculator | undefined;
  private nonceManager: INonceManager | undefined;
  private transactionSigner: ITransactionSigner | undefined;

  private readonly subModules: ModuleBuilder[];
  private readonly moduleSession: Namespace;

  constructor(moduleSession: Namespace, opts?: ModuleOptions) {
    this.bindings = {};
    this.actions = {};
    this.prototypes = {};
    this.resolver = undefined;
    this.registry = undefined;
    this.contractEvents = {};
    this.moduleEvents = {
      onFail: {},
      onSuccess: {},
      onCompletion: {},
      onStart: {}
    };
    this.opts = {
      params: {}
    };
    if (checkIfExist(opts)) {
      this.opts = opts as ModuleOptions;
    }
    this.subModules = [];
    this.moduleSession = moduleSession;
  }

  /**
   * Define contract with name and his constructor arguments.
   *
   * Usage example: m.contract(name, arg1, arg2, ...)
   *
   * @param name Contract name defined in solidity file.
   * @param args Constructor arguments. In case of contract binding just provide reference.
   */
  contract(name: string, ...args: Arguments): ContractBinding {
    if (checkIfExist(this.bindings[name])) {
      cli.info('Contract already bind to the module - ', name);
      cli.exit(0);
    }

    const moduleName = this.moduleSession.get(clsNamespaces.MODULE_NAME);
    this.bindings[name] = new ContractBinding(name, name, args, moduleName);
    this[name] = this.bindings[name];
    return this.bindings[name];
  }

  /**
   * Define contract with name and his constructor arguments that is library to other contracts.
   *
   * Usage example: m.library(name, arg1, arg2, ...)
   *
   * @param name Contract name.
   * @param args Constructor arguments, if any.
   */
  library(name: string, ...args: Arguments): ContractBinding {
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
  group(...dependencies: (ContractBinding | ContractEvent)[]): GroupedDependencies {
    return new GroupedDependencies(dependencies);
  }

  /**
   * Prototype is the way to say to hardhat-ignition that this contract is going to be deployed multiple times.
   *
   * @param name Solidity contract name
   */
  prototype(name: string): Prototype {
    this.prototypes[name] = new Prototype(name);

    return this.prototypes[name];
  }

  /**
   * Create contract deployment for contract with `prototypeName` that you previously defined.
   *
   * @param name Unique "friendly" contract name
   * @param prototypeName Solidity contract name provided in .protytpe function
   * @param args Constructor arguments.
   */
  bindPrototype(name: string, prototypeName: string, ...args: Arguments): ContractBinding {
    if (checkIfExist(this.bindings[name])) {
      throw new BindingsConflict(`Contract already bind to the module - ${name}`);
    }

    if (!checkIfExist(this.prototypes[prototypeName])) {
      throw new PrototypeNotFound(`Prototype with name ${prototypeName} is not found in this module`);
    }

    const moduleName = this.moduleSession.get(clsNamespaces.MODULE_NAME);
    this.bindings[name] = new ContractBinding(name, this.prototypes[prototypeName].contractName, args, moduleName);
    this[name] = this.bindings[name];

    return this.bindings[name];
  }

  /**
   * Sets single custom module parameter.
   *
   * @param name Parameter name
   * @param value Parameter value.
   */
  param(name: string, value: any) {
    this.opts.params[name] = value;
  }

  /**
   * Fetching custom module parameter.
   *
   * @param name
   */
  getParam(name: string): any {
    if (!checkIfExist(this.opts)) {
      throw new CliError('This module doesnt have params, check if you are deploying right module!');
    }

    return this.opts.params[name];
  }

  /**
   * Sets custom module parameters.
   *
   * @param opts Module options.
   */
  setParam(opts: ModuleOptions) {
    if (!checkIfExist(opts.params)) {
      return;
    }

    this.opts = opts;

    for (const [paramName, param] of Object.entries(opts.params)) {
      this[paramName] = param;
    }
  }

  addEvent(eventName: string, event: Event): void {
    if (checkIfExist(this.contractEvents[eventName])) {
      throw new UserError(`Event with same name is already initialized in module - ${eventName}`);
    }

    this.contractEvents[eventName] = new StatefulEvent(
      event,
      false,
      {}
    );
    this[eventName] = this.contractEvents[eventName];
  }

  getEvent(eventName: string): StatefulEvent {
    if (!checkIfExist(this.contractEvents[eventName])) {
      throw new UserError(`Event with this name ${eventName} doesn't exist.`);
    }

    return this.contractEvents[eventName];
  }

  getAllEvents(): Events {
    return this.contractEvents;
  }

  getAllModuleEvents(): ModuleEvents {
    return this.moduleEvents;
  }

  /**
   * Action is best way to wrap some dynamic functionality in order to be executed in later execution.
   *
   * @param name Action name
   * @param fn User defined custom fucntion.
   */
  registerAction(name: string, fn: ActionFn): Action {
    const action = new Action(name, fn);
    this.actions[name] = action;
    this[name] = this.actions[name];

    return action;
  }

  /**
   * Assigning sub-module. This function will share current share current module builder data (contracts and event) with
   * sub-module. On function execution it will return the context.
   *
   * @param m Module object
   * @param opts Optional module options
   * @param wallets Optional wallets that is going to be surfaced inside sub-module,
   *
   * @returns Module builder data from sub-module.
   */
  async module(m: Module | Promise<Module>, opts?: ModuleOptions, wallets?: ethers.Wallet[]): Promise<ModuleBuilder> {
    const options = opts ? Object.assign(this.opts, opts) : this.opts;

    if (m instanceof Promise) {
      m = await m;
    }

    let moduleBuilder: ModuleBuilder;
    if (!m.isInitialized()) {
      moduleBuilder = await m.init(this.moduleSession, wallets, this, options);
    }

    const bindings = m.getAllBindings();
    const events = m.getAllEvents();

    const networkId = process.env.IGNITION_NETWORK_ID || '';
    const resolver = await m.getRegistry();

    for (const [eventName, event] of Object.entries(events)) {
      if (
        checkIfExist(this.contractEvents[eventName]) // @TODO add error logic here instead of skipping
      ) {
        continue;
      }

      this.addEvent(eventName, event.event);
    }

    for (const [bindingName, binding] of Object.entries(bindings)) {
      if (
        checkIfExist(this.bindings[bindingName]) &&
        this.bindings[bindingName] &&
        !compareBytecode(this.bindings[bindingName].bytecode, binding.bytecode)
      ) {
        continue;
      }

      binding.deployMetaData.contractAddress = await resolver?.resolveContract(+networkId, m.name, bindingName);
      this[bindingName] = binding;
      this.bindings[bindingName] = binding;
    }

    this.prototypes = m.getAllPrototypes();

    return moduleBuilder;
  }

  getAllSubModules(): ModuleBuilder[] {
    return this.subModules;
  }

  getBinding(name: string): ContractBinding {
    return this.bindings[name];
  }

  getAllBindings(): { [name: string]: ContractBinding } {
    return this.bindings;
  }

  getAllActions(): { [name: string]: Action } {
    return this.actions;
  }

  setResolver(resolver: IModuleRegistryResolver): void {
    this.resolver = resolver;
  }

  getResolver(): IModuleRegistryResolver | undefined {
    return this.resolver;
  }

  setRegistry(registry: IModuleRegistryResolver): void {
    this.registry = registry;
  }

  setCustomGasPriceProvider(provider: IGasPriceCalculator): void {
    this.gasPriceProvider = provider;
  }

  getCustomGasPriceProvider(): IGasPriceCalculator {
    return this.gasPriceProvider;
  }

  setCustomNonceManager(nonceManager: INonceManager): void {
    this.nonceManager = nonceManager;
  }

  getCustomNonceManager(): INonceManager {
    return this.nonceManager;
  }

  setCustomTransactionSigner(txSigner: ITransactionSigner): void {
    this.transactionSigner = txSigner;
  }

  getCustomTransactionSigner(): ITransactionSigner {
    return this.transactionSigner;
  }

  getRegistry(): IModuleRegistryResolver | undefined {
    return this.registry;
  }

  getAllPrototypes(): { [name: string]: Prototype } {
    return this.prototypes;
  }

  getAllOpts(): ModuleOptions {
    return this.opts;
  }

  /**
   * OnStart Module event. This event is always running first, before another event in event lifecycle.
   *
   * @param eventName Unique event name
   * @param fn Module event function
   */
  onStart(eventName: string, fn: ModuleEventFn): void {
    this.moduleEvents.onStart[eventName] = {
      name: eventName,
      eventType: EventType.OnStart,
      fn: fn
    };
  }

  /**
   * OnCompletion module event is run when module execution is finished, event if it has errored.
   *
   * @param eventName Unique event name
   * @param fn Module event function
   */
  onCompletion(eventName: string, fn: ModuleEventFn): void {
    this.moduleEvents.onCompletion[eventName] = {
      name: eventName,
      eventType: EventType.OnCompletion,
      fn: fn
    };
  }

  /**
   * OnSuccess module event is run only if module execution is successfully finished.
   *
   * @param eventName Unique event name
   * @param fn Module event function
   */
  onSuccess(eventName: string, fn: ModuleEventFn): void {
    this.moduleEvents.onSuccess[eventName] = {
      name: eventName,
      eventType: EventType.OnSuccess,
      fn: fn
    };
  }

  /**
   * OnFail module event is run only if module execution errored or failed for any other reason.
   *
   * @param eventName Unique event name
   * @param fn Module event function
   */
  onFail(eventName: string, fn: ModuleEventFn): void {
    this.moduleEvents.onFail[eventName] = {
      name: eventName,
      eventType: EventType.OnFail,
      fn: fn
    };
  }
}

export class Prototype {
  public contractName: string;

  constructor(contractName: string) {
    this.contractName = contractName;
  }
}

export class Module {
  private isUsage: boolean = false;

  private initialized: boolean = false;
  private fn: ModuleBuilderFn;

  readonly name: string;
  private opts: ModuleOptions;
  private bindings: { [name: string]: ContractBinding };
  private events: Events;
  private moduleEvents: ModuleEvents;
  private actions: { [name: string]: Action };
  private moduleConfig: ModuleConfig | undefined;
  private prototypes: { [name: string]: Prototype };

  private registry: IModuleRegistryResolver | undefined;
  private resolver: IModuleRegistryResolver | undefined;
  private gasPriceProvider: IGasPriceCalculator | undefined;
  private nonceManager: INonceManager | undefined;
  private transactionSigner: ITransactionSigner | undefined;

  constructor(
    moduleName: string,
    fn: ModuleBuilderFn,
    moduleConfig: ModuleConfig | undefined,
    usageModule: boolean = false
  ) {
    this.name = moduleName;
    this.fn = fn;
    this.moduleConfig = moduleConfig;
    this.isUsage = usageModule;

    this.opts = {
      params: {}
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async init(moduleSession: Namespace, wallets?: ethers.Wallet[], m?: ModuleBuilder, opts?: ModuleOptions): Promise<ModuleBuilder> {
    if (checkIfExist(opts)) {
      this.opts = opts;
    }
    let moduleBuilder = m ? m : new ModuleBuilder(moduleSession, opts);
    moduleBuilder.setParam(opts);

    // this is needed in order for ContractBindings to be aware of their originating module for later context changes
    moduleSession.set(clsNamespaces.MODULE_NAME, this.name);
    await this.fn(moduleBuilder, wallets);

    moduleBuilder = await handleModule(moduleBuilder, this.name, this.isUsage, !!m);

    this.bindings = moduleBuilder.getAllBindings();
    this.events = moduleBuilder.getAllEvents();
    this.moduleEvents = moduleBuilder.getAllModuleEvents();
    this.actions = moduleBuilder.getAllActions();
    this.registry = moduleBuilder.getRegistry();
    this.resolver = moduleBuilder.getResolver();
    this.gasPriceProvider = moduleBuilder.getCustomGasPriceProvider();
    this.nonceManager = moduleBuilder.getCustomNonceManager();
    this.transactionSigner = moduleBuilder.getCustomTransactionSigner();
    this.prototypes = moduleBuilder.getAllPrototypes();
    this.opts = moduleBuilder.getAllOpts();

    this.initialized = true;

    return moduleBuilder;
  }

  getAllBindings(): { [name: string]: ContractBinding } {
    return this.bindings;
  }

  getAllEvents(): Events {
    return this.events;
  }

  getOpts(): ModuleOptions {
    return this.opts;
  }

  getAllModuleEvents(): ModuleEvents {
    return this.moduleEvents;
  }

  getAllActions(): { [name: string]: Action } {
    return this.actions;
  }

  getRegistry(): IModuleRegistryResolver | undefined {
    return this.registry;
  }

  setRegistry(registry: IModuleRegistryResolver): void {
    this.registry = registry;
  }

  getResolver(): IModuleRegistryResolver | undefined {
    return this.resolver;
  }

  setResolver(resolver: IModuleRegistryResolver): void {
    this.resolver = resolver;
  }

  getAction(name: string): Action {
    return this.actions[name];
  }

  getModuleConfig(): ModuleConfig | undefined {
    return this.moduleConfig;
  }

  getAllPrototypes(): { [name: string]: Prototype } {
    return this.prototypes;
  }

  getCustomGasPriceProvider(): IGasPriceCalculator {
    return this.gasPriceProvider;
  }

  getCustomNonceManager(): INonceManager {
    return this.nonceManager;
  }

  getCustomTransactionSigner(): ITransactionSigner {
    return this.transactionSigner;
  }
}

/**
 * This function is instantiating module class that will be used by hardhat-ignition in order to read user defined contracts and
 * events in order.
 *
 * @param moduleName Name of the module
 * @param fn Function that will be used to build module.
 * @param moduleConfig Deployment module config, defines which bindings would be skipped.
 */
export async function buildModule(moduleName: string, fn: ModuleBuilderFn, moduleConfig: ModuleConfig | undefined = undefined): Promise<Module> {
  return new Module(moduleName, fn, moduleConfig);
}

/**
 * This function is instantiating module class that will be used by hardhat-ignition in order to read user defined contracts and
 * events in order. This is not intended to be a valid deployment module, but rather to be used only as a sub-module
 * with resolver specified in hardhat-ignition.config.ts/js script.
 *
 * @param moduleName Name of the module
 * @param fn Function that will be used to build module.
 * @param moduleConfig Deployment module config, defines which bindings would be skipped.
 */
export async function buildUsage(moduleName: string, fn: ModuleBuilderFn, moduleConfig: ModuleConfig | undefined = undefined): Promise<Module> {
  return new Module(moduleName, fn, moduleConfig, true);
}

async function handleModule(moduleBuilder: ModuleBuilder, moduleName: string, isUsage: boolean, isSubModule: boolean): Promise<ModuleBuilder> {
  const compiler = new HardhatCompiler();
  const moduleValidator = new ModuleValidator();

  const contractBuildNames: string[] = [];
  const moduleBuilderBindings = moduleBuilder.getAllBindings();
  for (const [, bind] of Object.entries(moduleBuilderBindings)) {
    contractBuildNames.push(bind.contractName);
  }

  if (!isSubModule) {
    compiler.compile(); // @TODO: make this more suitable for other compilers
  }
  const bytecodes: { [name: string]: string } = compiler.extractBytecode(contractBuildNames);
  const abi: { [name: string]: JsonFragment[] } = compiler.extractContractInterface(contractBuildNames);
  const libraries: LinkReferences = compiler.extractContractLibraries(contractBuildNames);

  if (!isUsage) {
    moduleValidator.validate(moduleBuilderBindings, abi);
  }

  for (const [bindingName, binding] of Object.entries(moduleBuilderBindings)) {
    moduleBuilderBindings[bindingName].bytecode = bytecodes[binding.contractName];
    moduleBuilderBindings[bindingName].abi = abi[binding.contractName];
    moduleBuilderBindings[bindingName].libraries = libraries[binding.contractName];
  }

  return moduleBuilder;
}

