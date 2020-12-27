import { ModuleStateRepo } from '../packages/modules/states/state_repo';
import { HardhatCompiler } from '../packages/ethereum/compiler/hardhat';
import { checkIfExist, checkIfSameInputs, checkIfSuitableForInstantiating } from '../packages/utils/util';
import { ModuleValidator } from '../packages/modules/module_validator';
import { JsonFragment, JsonFragmentType } from '../packages/types/artifacts/abi';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';
import { cli } from 'cli-ux';
import { CallOverrides, ethers } from 'ethers';
import { ContractFunction } from '@ethersproject/contracts/src.ts/index';
import { FunctionFragment } from '@ethersproject/abi';
import { EthTxGenerator } from '../packages/ethereum/transactions/generator';
import { Prompter } from '../packages/prompter';
import { BLOCK_CONFIRMATION_NUMBER } from '../packages/ethereum/transactions/executor';
import { UserError } from '../packages/types/errors';
import { IModuleRegistryResolver } from '../packages/modules/states/registry';
import { LinkReferences, SingleContractLinkReference } from '../packages/types/artifacts/libraries';

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

// @TODO simplify
export type BeforeDeployEvent = { name: string, eventType: string, fn: EventFnCompiled, deps: ContractBinding[], eventDeps: ContractEvent[] };
export type BeforeDeploymentEvent = { name: string, eventType: string, fn: EventFnCompiled, deps: ContractBinding[], eventDeps: ContractEvent[] };
export type AfterDeployEvent = { name: string, eventType: string, fn: EventFnDeployed, deps: ContractBinding[], eventDeps: ContractEvent[] };
export type AfterDeploymentEvent = { name: string, eventType: string, fn: EventFnDeployed, deps: ContractBinding[], eventDeps: ContractEvent[] };
export type BeforeCompileEvent = { name: string, eventType: string, fn: EventFn, deps: ContractBinding[], eventDeps: ContractEvent[] };
export type AfterCompileEvent = { name: string, eventType: string, fn: EventFnCompiled, deps: ContractBinding[], eventDeps: ContractEvent[] };
export type OnChangeEvent = { name: string, eventType: string, fn: RedeployFn, deps: ContractBinding[], eventDeps: ContractEvent[] };

export type ModuleEvent = { name: string, eventType: string, fn: ModuleEventFn };

export type MetaDataEvent = { name: string, eventType: string, deps?: string[], eventDeps?: string[]};

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

export class StatefulEvent {
  public event: Event;
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

export type ModuleBuilderFn = (m: ModuleBuilder) => Promise<void>;

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

export class ContractBinding extends Binding {
  public contractName: string;
  public args: Arguments;
  public eventsDeps: EventsDepRef;

  public bytecode: string | undefined;
  public abi: JsonFragment[] | undefined;
  public libraries: SingleContractLinkReference | undefined;

  public txData: TransactionData | undefined;
  public contractTxProgress: number | undefined;

  private contractInstance: ethers.Contract | undefined;

  public signer: ethers.Signer | undefined;
  public prompter: Prompter | undefined;
  public txGenerator: EthTxGenerator | undefined;
  public moduleStateRepo: ModuleStateRepo | undefined;

  constructor(
    // metadata
    name: string, contractName: string, args: Arguments,
    bytecode?: string, abi?: JsonFragment[], libraries?: SingleContractLinkReference, txData?: TransactionData,
    // event hooks
    events?: EventsDepRef,
    signer?: ethers.Signer,
    prompter?: Prompter,
    txGenerator?: EthTxGenerator,
    moduleStateRepo?: ModuleStateRepo,
  ) {
    super(name);
    this.args = args;
    this.contractName = contractName;
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
  }

  instance(): ethers.Contract {
    if (this.contractInstance) {
      return this.contractInstance;
    }

    if (!checkIfSuitableForInstantiating(this)) {
      throw new UserError('Binding is not suitable to be instantiated, please deploy it first');
    }

    this.contractInstance = new ContractInstance(
      this,
      this.txData?.contractAddress as string,
      this.abi as JsonFragment[],
      this.signer as ethers.Signer,
      this.prompter as Prompter,
      this.txGenerator as EthTxGenerator,
      this.moduleStateRepo as ModuleStateRepo
    ) as unknown as ethers.Contract;

    return this.contractInstance;
  }

  // beforeDeployment executes each time a deployment command is executed.
  beforeDeployment(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...dependencies: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeDeployment.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }

    const bindings: ContractBinding[] = [];
    const events: ContractEvent[] = [];
    dependencies.unshift(this);
    for (const dep of dependencies) {
      if (dep instanceof ContractBinding) {
        dep.eventsDeps.beforeDeployment.push(eventName);

        bindings.push(dep);
      } else {
        events.push(dep as ContractEvent);
      }
    }

    const beforeDeployment: BeforeDeploymentEvent = {
      name: eventName,
      eventType: 'BeforeDeploymentEvent',
      fn,
      deps: bindings,
      eventDeps: events,
    };
    m.addEvent(eventName, beforeDeployment);

    return beforeDeployment;
  }

  // afterDeployment executes each time after a deployment has finished.
  // The deployment doesn't actually have to perform any deployments for this event to trigger.
  afterDeployment(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...dependencies: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.afterDeployment.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }

    const bindings: ContractBinding[] = [];
    const events: ContractEvent[] = [];
    dependencies.unshift(this);
    this.eventsDeps.afterDeployment.push(eventName);
    for (const dep of dependencies) {
      if (dep instanceof ContractBinding) {
        dep.eventsDeps.afterDeployment.push(eventName);

        bindings.push(dep);
      } else {
        events.push(dep as ContractEvent);
      }
    }

    const afterDeploymentEvent: AfterDeploymentEvent = {
      name: eventName,
      eventType: 'AfterDeploymentEvent',
      fn,
      deps: bindings,
      eventDeps: events,
    };
    m.addEvent(eventName, afterDeploymentEvent);

    return afterDeploymentEvent;
  }

  // beforeDeploy runs each time the Binding is about to be triggered.
  // This event can be used to force the binding in question to be deployed.
  beforeDeploy(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...dependencies: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }

    dependencies.unshift(this);
    const bindings: ContractBinding[] = [];
    const events: ContractEvent[] = [];
    this.eventsDeps.beforeDeploy.push(eventName);
    for (const dep of dependencies) {
      if (dep instanceof ContractBinding) {
        dep.eventsDeps.beforeDeploy.push(eventName);

        bindings.push(dep);
      } else {
        events.push(dep as ContractEvent);
      }
    }

    const beforeDeployEvent: BeforeDeployEvent = {
      name: eventName,
      eventType: 'BeforeDeployEvent',
      fn,
      deps: bindings,
      eventDeps: events,
    };
    m.addEvent(eventName, beforeDeployEvent);

    return beforeDeployEvent;
  }

  // afterDeploy runs after the Binding was deployed.
  afterDeploy(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...dependencies: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }

    dependencies.unshift(this);
    const bindings: ContractBinding[] = [];
    const events: ContractEvent[] = [];
    this.eventsDeps.afterDeploy.push(eventName);
    for (const dep of dependencies) {
      if (dep instanceof ContractBinding) {
        dep.eventsDeps.afterDeploy.push(eventName);

        bindings.push(dep);
      } else {
        events.push(dep as ContractEvent);
      }
    }

    const afterDeployEvent: AfterDeployEvent = {
      name: eventName,
      eventType: 'AfterDeployEvent',
      fn,
      deps: bindings,
      eventDeps: events,
    };
    m.addEvent(eventName, afterDeployEvent);

    return afterDeployEvent;
  }

  // beforeCompile runs before the source code is compiled.
  beforeCompile(m: ModuleBuilder, eventName: string, fn: EventFn, ...dependencies: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }

    const bindings: ContractBinding[] = [];
    const events: ContractEvent[] = [];
    dependencies.unshift(this);
    this.eventsDeps.beforeCompile.push(eventName);
    for (const dep of dependencies) {
      if (dep instanceof ContractBinding) {
        dep.eventsDeps.beforeCompile.push(eventName);

        bindings.push(dep);
      } else {
        events.push(dep as ContractEvent);
      }
    }
    const beforeCompileEvent: BeforeCompileEvent = {
      name: eventName,
      eventType: 'BeforeCompileEvent',
      fn,
      deps: bindings,
      eventDeps: events,
    };
    m.addEvent(eventName, beforeCompileEvent);

    return beforeCompileEvent;
  }

  // afterCompile runs after the source code is compiled and the bytecode is available.
  afterCompile(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...dependencies: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }

    const bindings: ContractBinding[] = [];
    const events: ContractEvent[] = [];
    dependencies.unshift(this);
    this.eventsDeps.afterCompile.push(eventName);
    for (const dep of dependencies) {
      if (dep instanceof ContractBinding) {
        dep.eventsDeps.afterCompile.push(eventName);

        bindings.push(dep);
      } else {
        events.push(dep as ContractEvent);
      }
    }

    const afterCompileEvent: AfterCompileEvent = {
      name: eventName,
      eventType: 'AfterCompileEvent',
      fn,
      deps: bindings,
      eventDeps: events,
    };
    m.addEvent(eventName, afterCompileEvent);

    return afterCompileEvent;
  }

  // onChange runs after the Binding gets redeployed or changed
  onChange(m: ModuleBuilder, eventName: string, fn: RedeployFn, ...dependencies: (ContractBinding | ContractEvent)[]): ContractEvent {
    if (this.eventsDeps.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`);
    }

    const bindings: ContractBinding[] = [];
    const events: ContractEvent[] = [];
    dependencies.unshift(this);
    this.eventsDeps.onChange.push(eventName);
    for (const dep of dependencies) {
      if (dep instanceof ContractBinding) {
        dep.eventsDeps.onChange.push(eventName);

        bindings.push(dep);
      } else {
        events.push(dep as ContractEvent);
      }
    }

    const onChangeEvent: OnChangeEvent = {
      name: eventName,
      eventType: 'OnChangeEvent',
      fn,
      deps: bindings,
      eventDeps: events,
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

type TxData = {
  from: string
  input: string
};

export enum TransactionState {
  UNKNOWN,
  PENDING,
  REPLACED,
  IN_BLOCK,
}

export type ContractInput = {
  functionName: string
  inputs: JsonFragmentType[]
};

export type TransactionData = {
  input: TxData | undefined
  output: TransactionReceipt | undefined
  contractAddress?: string
};

export type EventTransactionData = {
  contractInput: ContractInput[]
  contractOutput: TransactionResponse[]
};

export class RegistryContractBinding extends ContractBinding {
  constructor(
    // metadata
    name: string, contractName: string, args: Arguments, bytecode?: string, abi?: JsonFragment[], libraries?: SingleContractLinkReference, txData?: TransactionData,
    // event hooks
    events?: EventsDepRef | undefined
  ) {
    super(name, contractName, args, bytecode, abi, libraries, txData, events);
  }
}

export class ContractInstance {
  private readonly contractBinding: ContractBinding;
  private readonly prompter: Prompter;
  private readonly moduleStateRepo: ModuleStateRepo;

  [key: string]: any;

  constructor(
    contractBinding: ContractBinding,
    contractAddress: string,
    abi: JsonFragment[],
    signer: ethers.Signer,
    prompter: Prompter,
    txGenerator: EthTxGenerator,
    moduleStateRepo: ModuleStateRepo,
  ) {
    this.prompter = prompter;
    this.txGenerator = txGenerator;
    this.contractBinding = contractBinding;

    if (!checkIfExist(this.contractBinding?.contractTxProgress)) {
      this.contractBinding.contractTxProgress = 0;
    }

    this.moduleStateRepo = moduleStateRepo;
    const parent: any = new ethers.Contract(contractAddress, abi, signer);

    // @TODO: think how to achieve same thing with more convenient approach
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

    Object.keys(parent).forEach((key) => {
      if (this[key] != undefined) {
        return;
      }

      this[key] = parent[key];
    });
  }

  private buildDefaultWrapper(contractFunction: ContractFunction, fragment: FunctionFragment): ContractFunction {
    return async (...args: Array<any>): Promise<TransactionResponse> => {
      // allowing user to override ethers with his override params

      // @TODO add option validation also
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

      const currentEventTransactionData = await this.moduleStateRepo.getEventTransactionData(this.contractBinding.name);

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

      cli.info('Execute contract function - ', fragment.name);
      cli.debug(fragment.name, ...args);
      await this.prompter.promptExecuteTx();

      const txData = await this.txGenerator.fetchTxData(await this.signer.getAddress());
      overrides = {
        gasPrice: overrides.gasPrice ? overrides.gasPrice : txData.gasPrice,
        value: overrides.value ? overrides.value : undefined,
        gasLimit: overrides.gasLimit ? overrides.gasLimit : undefined,
        nonce: txData.nonce,
      };

      await this.prompter.sendingTx();
      const tx = await contractFunction(...args, overrides);
      await this.prompter.sentTx();

      this.prompter.waitTransactionConfirmation();
      await tx.wait(1);
      this.prompter.transactionConfirmation(1);

      this.prompter.waitTransactionConfirmation();
      const txReceipt = await tx.wait(BLOCK_CONFIRMATION_NUMBER);
      await this.moduleStateRepo.storeEventTransactionData(this.contractBinding.name, currentEventTransactionData.contractInput[contractTxIterator], txReceipt);
      this.prompter.transactionConfirmation(BLOCK_CONFIRMATION_NUMBER);

      this.contractBinding.contractTxProgress = ++contractTxIterator;

      return tx;
    };
  }

  private buildConstantWrappers(contractFunction: ContractFunction, fragment: FunctionFragment): ContractFunction {
    return async (...args: Array<any>): Promise<TransactionResponse> => {
      args = ContractInstance.formatArgs(args);

      return await contractFunction(...args);
    };
  }

  private static formatArgs(args: Array<any>): Array<any> {
    let i = 0;
    for (let arg of args) {
      if (checkIfExist(arg?.contractName) && !checkIfExist(arg?.txData.contractAddress)) {
        throw new UserError(`You are trying to use contract that is not deployed ${arg.name}`);
      }

      if (checkIfExist(arg?.txData?.contractAddress)) {
        arg = arg as ContractBinding;

        args[i] = arg.txData.contractAddress;
      }

      i++;
    }

    return args;
  }
}

export class ContractBindingMetaData {
  public name: string;
  public contractName: string;
  public args: Arguments;
  public bytecode: string | undefined;
  public abi: JsonFragment[] | undefined;
  public libraries: SingleContractLinkReference | undefined;
  public txData: TransactionData | undefined;

  constructor(name: string, contractName: string, args: Arguments, bytecode?: string, abi?: JsonFragment[], libraries?: SingleContractLinkReference, txData?: TransactionData) {
    this.name = name;
    this.contractName = contractName;
    this.args = args;
    this.bytecode = bytecode;
    this.abi = abi;
    this.libraries = libraries;
    this.txData = txData;
  }
}

export class ModuleBuilder {
  private opts: ModuleOptions;
  private readonly bindings: { [name: string]: ContractBinding };
  private readonly contractEvents: Events;
  private readonly moduleEvents: ModuleEvents;
  private readonly actions: { [name: string]: Action };
  private resolver: IModuleRegistryResolver | undefined;
  private registry: IModuleRegistryResolver | undefined;

  constructor(opts?: ModuleOptions) {
    this.opts = {params: {}};
    this.bindings = {};
    this.actions = {};
    this.resolver = undefined;
    this.registry = undefined;
    this.contractEvents = {};
    this.moduleEvents = {
      onFail: {},
      onSuccess: {},
      onCompletion: {},
      onStart: {}
    };

    if (typeof opts !== 'undefined') {
      this.opts = opts as ModuleOptions;
    }
  }

  // use links all definitions from the provided Module
  // and returns the provided Module so its' bindings can be used?.
  // use(m: Module, opts?: ModuleOptions): Module;

  contract(name: string, ...args: Arguments): ContractBinding {
    if (checkIfExist(this.bindings[name])) {
      cli.info('Contract already bind to the module - ', name);
      cli.exit(0);
    }

    this.bindings[name] = new ContractBinding(name, name, args);
    return this.bindings[name];
  }

  bindPrototype(name: string, prototype: Prototype, ...args: Arguments): ContractBinding {

    if (checkIfExist(this.bindings[name])) {
      cli.info('Contract already bind to the module - ', name);
      cli.exit(0);
    }

    this.bindings[name] = new ContractBinding(name, prototype.contractName, args);;
    return this.bindings[name];
  }

  // bindDeployed(name: string, address: string, network?: string): DeployedBinding;

  // name = instance contract name.
  // factory = factory which is called.
  // method = factory method name.
  // args = any args common to all instances.
  // bindFactory(name: string, factory: ContractBinding, method: string, ...args: Arguments): FactoryPrototypeBinding;
  //
  // bindAlias(alias: string, binding: Binding, force?: boolean): AliasedBinding
  //
  // bindCopy(name: string, proto: ContractBinding, ...override: Arguments): ContractBinding;
  //
  // bindValue(name: string, val: any): ValueBinding
  //
  // bindParam(name: string, defaultValue?: any): ModuleParamBinding;
  //
  // bindLazy(name: string, fn: LazyFn): LazyBinding;
  //
  // bindContractConst(contract: ContractBinding, constName: string, constValue: Binding): ContractConstBinding;
  //
  // autoBind(opts: AutoBindOptions): Binding[];
  //
  addEvent(eventName: string, event: Event): void {
    if (checkIfExist(this.contractEvents[eventName])) {
      throw new UserError(`Event with same name is already initialized in module - ${eventName}`);
    }

    this.contractEvents[eventName] = new StatefulEvent(
      event,
      false,
      {}
    );
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

  registerAction(name: string, fn: ActionFn): Action {
    const action = new Action(name, fn);
    this.actions[name] = action;

    return action;
  }

  async bindModule(m: Module): Promise<void> {
    const bindings = m.getAllBindings();

    const networkId = process.env.MORTAR_NETWORK_ID || '';
    const resolver = await m.getRegistry();

    for (const [bindingName, binding] of Object.entries(bindings)) {
      if (checkIfExist(this.bindings[bindingName])) {
        throw new UserError('Conflict when merging two modules, check if their is same binding name.');
      }

      const contractAddress = await resolver?.resolveContract(+networkId, m.name, bindingName);

      this.bindings[bindingName] = new RegistryContractBinding(
        binding.name,
        binding.contractName,
        binding.args,
        binding.bytecode,
        binding.abi,
        binding.libraries,
        {
          contractAddress: contractAddress,
          input: undefined,
          output: undefined
        },
        undefined,
      );
    }
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

  getRegistry(): IModuleRegistryResolver | undefined {
    return this.registry;
  }

  // module eventsDeps below
  onStart(eventName: string, fn: ModuleEventFn): void {
    this.moduleEvents.onStart[eventName] = {
      name: eventName,
      eventType: 'OnStart',
      fn: fn
    };
  }

  onCompletion(eventName: string, fn: ModuleEventFn): void {
    this.moduleEvents.onCompletion[eventName] = {
      name: eventName,
      eventType: 'OnCompletion',
      fn: fn
    };
  }

  onSuccess(eventName: string, fn: ModuleEventFn): void {
    this.moduleEvents.onSuccess[eventName] = {
      name: eventName,
      eventType: 'OnSuccess',
      fn: fn
    };
  }

  onFail(eventName: string, fn: ModuleEventFn): void {
    this.moduleEvents.onFail[eventName] = {
      name: eventName,
      eventType: 'OnFail',
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
  readonly name: string;
  private opts: ModuleOptions;
  private readonly bindings: { [name: string]: ContractBinding };
  private readonly events: Events;
  private readonly moduleEvents: ModuleEvents;
  private readonly actions: { [name: string]: Action };
  private registry: IModuleRegistryResolver | undefined;
  private resolver: IModuleRegistryResolver | undefined;

  constructor(
    moduleName: string,
    bindings: { [name: string]: ContractBinding },
    events: Events,
    moduleEvents: ModuleEvents,
    actions: { [name: string]: Action },
    registry: IModuleRegistryResolver | undefined,
    resolver: IModuleRegistryResolver | undefined,
  ) {
    this.name = moduleName;
    this.opts = {params: {}};
    this.bindings = bindings;
    this.actions = actions;
    this.registry = registry;
    this.resolver = resolver;
    this.events = events;
    this.moduleEvents = moduleEvents;
  }


  // call(name: string, ...args: any[]): void;
  //
  // getBinding(name: string): Binding;
  //
  // beforeDeploy(fn: ModuleEventFn, ...bindings: Binding[]): void;
  //
  // afterDeploy(fn: ModuleEventFn, ...bindings: Binding[]): void;
  //
  // afterEach(fn: ModuleAfterEachFn, ...bindings: Binding[]): void;

  getAllBindings(): { [name: string]: ContractBinding } {
    return this.bindings;
  }

  getAllEvents(): Events {
    return this.events;
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
}

export async function module(moduleName: string, fn: ModuleBuilderFn): Promise<Module> {
  const moduleBuilder = new ModuleBuilder();
  await fn(moduleBuilder);

  const compiler = new HardhatCompiler();
  const moduleValidator = new ModuleValidator();

  const contractBuildNames: string[] = [];
  const moduleBuilderBindings = moduleBuilder.getAllBindings();
  for (const [_, bind] of Object.entries(moduleBuilderBindings)) {
    contractBuildNames.push(bind.contractName + '.json');
  }

  compiler.compile(); // @TODO: make this more suitable for other compilers
  const bytecodes: { [name: string]: string } = compiler.extractBytecode(contractBuildNames);
  const abi: { [name: string]: JsonFragment[] } = compiler.extractContractInterface(contractBuildNames);
  const libraries: LinkReferences = compiler.extractContractLibraries(contractBuildNames);

  moduleValidator.validate(moduleBuilderBindings, abi);

  for (const [bindingName, binding] of Object.entries(moduleBuilderBindings)) {
    moduleBuilderBindings[bindingName].bytecode = bytecodes[binding.contractName];
    moduleBuilderBindings[bindingName].abi = abi[binding.contractName];
    moduleBuilderBindings[bindingName].libraries = libraries[binding.contractName];
  }

  return new Module(
    moduleName,
    moduleBuilderBindings,
    moduleBuilder.getAllEvents(),
    moduleBuilder.getAllModuleEvents(),
    moduleBuilder.getAllActions(),
    moduleBuilder.getRegistry(),
    moduleBuilder.getResolver(),
  );
}

