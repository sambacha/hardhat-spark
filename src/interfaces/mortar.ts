import {ModuleStateRepo} from "../packages/modules/states/state_repo";
import {ModuleResolver} from "../packages/modules/module_resolver";
import {HardhatCompiler} from "../packages/ethereum/compiler/hardhat";
import {checkIfExist, checkIfSameInputs} from "../packages/utils/util";
import {ModuleValidator} from "../packages/modules/module_validator";
import {JsonFragment, JsonFragmentType} from "../packages/types/abi"
import {TransactionReceipt, TransactionResponse} from "@ethersproject/abstract-provider";
import {cli} from "cli-ux";
import {EventHandler} from "../packages/modules/events/handler";
import {CallOverrides, ethers} from "ethers";
import ConfigService from "../packages/config/service";
import {ContractFunction} from "@ethersproject/contracts/src.ts/index";
import {FunctionFragment} from "@ethersproject/abi";
import {EthTxGenerator} from "../packages/ethereum/transactions/generator";
import {GasCalculator} from "../packages/ethereum/gas/calculator";
import {Prompter} from "../packages/prompter";
import {BLOCK_CONFIRMATION_NUMBER} from "../packages/ethereum/transactions/executor";
import {AbiMismatch, BytecodeMismatch, UserError} from "../packages/types/errors";
import {IModuleRegistryResolver} from "../packages/modules/states/registry";
import {ModuleState} from "../packages/modules/states/module";
import * as net from "net";

export type AutoBinding = any | Binding | ContractBinding | CompiledContractBinding | DeployedContractBinding;

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

export type RedeployFn = (...deps: DeployedContractBinding[]) => Promise<void>;

export type EventFnDeployed = (...deps: DeployedContractBinding[]) => Promise<void>;
export type EventFnCompiled = (...deps: CompiledContractBinding[]) => void;
export type EventFn = (...deps: ContractBinding[]) => void;

// @TODO simplify
export type BeforeDeployEvent = { name: string, eventType: string, fn: EventFnCompiled, deps: ContractBinding[] }
export type BeforeDeploymentEvent = { name: string, eventType: string, fn: EventFnCompiled, deps: ContractBinding[] }
export type AfterDeployEvent = { name: string, eventType: string, fn: EventFnDeployed, deps: ContractBinding[] }
export type AfterDeploymentEvent = { name: string, eventType: string, fn: EventFnDeployed, deps: ContractBinding[] }
export type BeforeCompileEvent = { name: string, eventType: string, fn: EventFn, deps: ContractBinding[] }
export type AfterCompileEvent = { name: string, eventType: string, fn: EventFnCompiled, deps: ContractBinding[] }
export type OnChangeEvent = { name: string, eventType: string, fn: RedeployFn, deps: ContractBinding[] }

export type Event =
  BeforeDeployEvent |
  AfterDeployEvent |
  AfterDeploymentEvent |
  BeforeDeploymentEvent |
  BeforeCompileEvent |
  AfterCompileEvent |
  OnChangeEvent

export type Events = { [name: string]: StatefulEvent }

export type BindingEventsRef = {
  beforeCompile: string[]
  afterCompile: string[]
  beforeDeployment: string[]
  afterDeployment: string[]
  beforeDeploy: string[]
  afterDeploy: string[]
  onChange: string[]
}

export class StatefulEvent {
  public event: Event
  public executed: boolean
  public txData: { [bindingName: string]: EventTransactionData }

  constructor(event: Event, executed: boolean, txData: { [bindingName: string]: EventTransactionData }) {
    this.event = event
    this.executed = executed
    this.txData = txData
  }
}

export type ModuleOptions = {
  // Module parameters used to customize Module behavior.
  params: { [name: string]: any }
}

export type ModuleBuilderFn = (m: ModuleBuilder) => Promise<void>;

export abstract class Binding {
  public name: string;

  constructor(name: string) {
    this.name = name
  }

  instance(m: ModuleBuilder): any {
    return {
      name: this.name
    }
  }
}

export class ContractBinding extends Binding {
  public args: Arguments;
  public events: BindingEventsRef

  constructor(name: string, args: Arguments) {
    super(name)
    this.args = args
    this.events = {
      beforeCompile: [],
      afterCompile: [],
      beforeDeployment: [],
      afterDeployment: [],
      beforeDeploy: [],
      afterDeploy: [],
      onChange: []
    }
  }

  instance(m: ModuleBuilder): any {
    return {
      name: this.name,
      args: this.args
    }
  }

  // beforeDeployment executes each time a deployment command is executed.
  beforeDeployment(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...bindings: ContractBinding[]): void {
    if (this.events.beforeDeployment.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`)
    }

    this.events.beforeDeployment.push(eventName)
    for (let binding of bindings) {
      binding.events.beforeDeployment.push(eventName)
    }

    bindings.unshift(this)
    const beforeDeployment: BeforeDeploymentEvent = {
      name: eventName,
      eventType: "BeforeDeploymentEvent",
      fn,
      deps: bindings,
    }
    m.addEvent(eventName, beforeDeployment)
  }

  // afterDeployment executes each time after a deployment has finished.
  // The deployment doesn't actually have to perform any deployments for this event to trigger.
  afterDeployment(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...bindings: ContractBinding[]): void {
    if (this.events.afterDeployment.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`)
    }

    this.events.afterDeployment.push(eventName)
    for (let binding of bindings) {
      binding.events.afterDeployment.push(eventName)
    }

    bindings.unshift(this)
    const afterDeploymentEvent: AfterDeploymentEvent = {
      name: eventName,
      eventType: "AfterDeploymentEvent",
      fn,
      deps: bindings,
    }
    m.addEvent(eventName, afterDeploymentEvent)
  }

  // beforeDeploy runs each time the Binding is about to be triggered.
  // This event can be used to force the binding in question to be deployed.
  beforeDeploy(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...bindings: ContractBinding[]): void {
    if (this.events.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`)
    }

    this.events.beforeDeploy.push(eventName)
    for (let binding of bindings) {
      binding.events.beforeDeploy.push(eventName)
    }

    bindings.unshift(this)
    const beforeDeployEvent: BeforeDeployEvent = {
      name: eventName,
      eventType: "BeforeDeployEvent",
      fn,
      deps: bindings,
    }
    m.addEvent(eventName, beforeDeployEvent)
  }

  // afterDeploy runs after the Binding was deployed.
  afterDeploy(m: ModuleBuilder, eventName: string, fn: EventFnDeployed, ...bindings: ContractBinding[]): void {
    if (this.events.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`)
    }

    this.events.afterDeploy.push(eventName)
    for (let binding of bindings) {
      binding.events.afterDeploy.push(eventName)
    }

    bindings.unshift(this)
    const afterDeployEvent: AfterDeployEvent = {
      name: eventName,
      eventType: "AfterDeployEvent",
      fn,
      deps: bindings,
    }
    m.addEvent(eventName, afterDeployEvent)
  }

  // beforeCompile runs before the source code is compiled.
  beforeCompile(m: ModuleBuilder, eventName: string, fn: EventFn, ...bindings: ContractBinding[]): void {
    if (this.events.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`)
    }

    this.events.beforeCompile.push(eventName)
    for (let binding of bindings) {
      binding.events.beforeCompile.push(eventName)
    }

    bindings.unshift(this)
    const beforeCompileEvent: BeforeCompileEvent = {
      name: eventName,
      eventType: "BeforeCompileEvent",
      fn,
      deps: bindings,
    }
    m.addEvent(eventName, beforeCompileEvent)
  }

  // afterCompile runs after the source code is compiled and the bytecode is available.
  afterCompile(m: ModuleBuilder, eventName: string, fn: EventFnCompiled, ...bindings: ContractBinding[]): void {
    if (this.events.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`)
    }

    this.events.afterCompile.push(eventName)
    for (let binding of bindings) {
      binding.events.afterCompile.push(eventName)
    }

    bindings.unshift(this)
    const afterCompileEvent: AfterCompileEvent = {
      name: eventName,
      eventType: "AfterCompileEvent",
      fn,
      deps: bindings,
    }
    m.addEvent(eventName, afterCompileEvent)
  }

  // onChange runs after the Binding gets redeployed or changed
  onChange(m: ModuleBuilder, eventName: string, fn: RedeployFn, ...bindings: ContractBinding[]): void {
    if (this.events.beforeDeploy.includes(eventName)) {
      throw new UserError(`Event with same name already initialized - ${eventName}`)
    }

    this.events.onChange.push(eventName)
    for (let binding of bindings) {
      binding.events.onChange.push(eventName)
    }

    bindings.unshift(this)
    const onChangeEvent: OnChangeEvent = {
      name: eventName,
      eventType: "OnChangeEvent",
      fn,
      deps: bindings,
    }
    m.addEvent(eventName, onChangeEvent)
  }
}

export class CompiledContractBinding extends ContractBinding {
  public bytecode: string;
  public abi: JsonFragment[]

  constructor(name: string, args: Arguments, bytecode: string, abi: JsonFragment[]) {
    super(name, args)
    this.bytecode = bytecode
    this.abi = abi
  }

  instance(m: ModuleBuilder): any {
    return {
      name: this.name,
      args: this.args,
      abi: this.abi,
      bytecode: this.bytecode
    }
  }
}

export class Action {
  public name: string;
  public action: ActionFn;

  constructor(name: string, action: ActionFn) {
    this.name = name
    this.action = action
  }
}

type TxData = {
  from: string
  input: string
}

export enum TransactionState {
  UNKNOWN,
  PENDING,
  REPLACED,
  IN_BLOCK,
}

export type ContractInput = {
  functionName: string
  inputs: JsonFragmentType[]
}

export type TransactionData = {
  input: TxData | null
  output: TransactionReceipt | null
  contractAddress?: string
}

export type EventTransactionData = {
  contractInput: ContractInput[]
  contractOutput: TransactionResponse[]
}

export class RegistryContractBinding extends CompiledContractBinding {
  public txData: TransactionData

  constructor(
    // metadata
    name: string, args: Arguments, bytecode: string, abi: JsonFragment[], txData: TransactionData,
    // event hooks
    events: BindingEventsRef | null,
  ) {
    super(name, args, bytecode, abi)
    this.txData = txData

    if (events) {
      this.events = events
    }
  }
}

export class DeployedContractBinding extends CompiledContractBinding {
  public txData: TransactionData
  public contractTxProgress: number

  private readonly signer: ethers.Signer
  private readonly prompter: Prompter
  private readonly txGenerator: EthTxGenerator
  private readonly moduleStateRepo: ModuleStateRepo

  constructor(
    // metadata
    name: string, args: Arguments, bytecode: string, abi: JsonFragment[], txData: TransactionData,
    // event hooks
    events: BindingEventsRef,
    signer: ethers.Signer,
    prompter: Prompter,
    txGenerator: EthTxGenerator,
    moduleStateRepo: ModuleStateRepo,
  ) {
    super(name, args, bytecode, abi)
    this.txData = txData
    this.contractTxProgress = 0

    this.events = events
    this.signer = signer
    this.prompter = prompter
    this.txGenerator = txGenerator
    this.moduleStateRepo = moduleStateRepo
  }

  instance(): ethers.Contract {
    return new ContractInstance(
      this,
      <string>this.txData.contractAddress,
      this.abi,
      this.signer,
      this.prompter,
      this.txGenerator,
      this.moduleStateRepo
    ) as unknown as ethers.Contract
  }
}

export class ContractInstance {
  private readonly deployedBinding: DeployedContractBinding
  private readonly prompter: Prompter
  private readonly moduleStateRepo: ModuleStateRepo

  [key: string]: any;

  constructor(
    deployedBinding: DeployedContractBinding,
    contractAddress: string,
    abi: JsonFragment[],
    signer: ethers.Signer,
    prompter: Prompter,
    txGenerator: EthTxGenerator,
    moduleStateRepo: ModuleStateRepo,
  ) {
    this.prompter = prompter
    this.txGenerator = txGenerator
    this.deployedBinding = deployedBinding
    this.moduleStateRepo = moduleStateRepo
    const parent: any = new ethers.Contract(contractAddress, abi, signer)

    // @TODO: think how to achieve same thing with more convenient approach
    Object.keys(parent.interface.functions).forEach((signature) => {
      const fragment = parent.interface.functions[signature];

      if (parent[signature] != null) {
        if (fragment.constant) {
          return
        }

        this[signature] = this.buildDefaultWrapper(parent[signature], fragment)
        this[fragment.name] = this[signature]
      }
    })

    Object.keys(parent).forEach((key) => {
      if (this[key] != null) {
        return
      }

      this[key] = parent[key]
    })
  }

  private buildDefaultWrapper(contractFunction: ContractFunction, fragment: FunctionFragment): ContractFunction {
    return async (...args: Array<any>): Promise<TransactionResponse> => {
      // allowing user to override ethers with his override params

      if (args.length === fragment.inputs.length + 1 && typeof (args[args.length - 1]) === "object") {
        return await contractFunction(...args)
      }

      let contractTxIterator = this.deployedBinding.contractTxProgress

      const currentEventTransactionData = await this.moduleStateRepo.getEventTransactionData(this.deployedBinding.name)

      if (currentEventTransactionData.contractOutput.length > contractTxIterator) {
        this.deployedBinding.contractTxProgress++
        return currentEventTransactionData.contractOutput[contractTxIterator]
      }

      const currentInputs = currentEventTransactionData.contractInput[contractTxIterator]
      const contractOutput = currentEventTransactionData.contractOutput[contractTxIterator]

      if (checkIfExist(currentInputs) &&
        checkIfSameInputs(currentInputs, fragment.name, args) && checkIfExist(contractOutput)) {
        cli.info("Contract function already executed: ", fragment.name, ...args, "... skipping")

        this.deployedBinding.contractTxProgress = ++contractTxIterator
        return contractOutput
      }

      if (
        (checkIfExist(currentInputs) && !checkIfSameInputs(currentInputs, fragment.name, args)) ||
        !checkIfExist(currentInputs)
      ) {
        currentEventTransactionData.contractInput[contractTxIterator] = {
          functionName: fragment.name,
          inputs: args,
        } as ContractInput
      }

      cli.info("Execute contract function - ", fragment.name)
      cli.debug(fragment.name, ...args)
      await this.prompter.promptExecuteTx()

      const txData = await this.txGenerator.fetchTxData(await this.signer.getAddress())
      const overrides: CallOverrides = {
        gasPrice: txData.gasPrice,
        nonce: txData.nonce,
      }

      await this.prompter.sendingTx()
      const tx = await contractFunction(...args, overrides)
      await this.prompter.sentTx()

      await tx.wait(BLOCK_CONFIRMATION_NUMBER)

      await this.moduleStateRepo.storeEventTransactionData(this.deployedBinding.name, currentEventTransactionData.contractInput[contractTxIterator], tx)
      this.deployedBinding.contractTxProgress = ++contractTxIterator

      return tx
    }
  }
}

export class ContractBindingMetaData {
  public name: string
  public args: Arguments
  public bytecode: string
  public abi: JsonFragment[]
  public txData: TransactionData

  constructor(name: string, args: Arguments, bytecode: string, abi: JsonFragment[], txData: TransactionData) {
    this.name = name
    this.args = args
    this.bytecode = bytecode
    this.abi = abi
    this.txData = txData
  }
}

export class EventMetaData {
  public name: string
  public dependencyNames: string[]
  public txData: { [name: string]: EventTransactionData }

  constructor(name: string, dependencyNames: string[], txData: { [name: string]: EventTransactionData }) {
    this.name = name
    this.dependencyNames = dependencyNames
    this.txData = txData
  }
}

export abstract class ModuleUse {
  abstract use<T extends Module>(m: T, opts?: ModuleOptions): T;
}

export class ModuleBuilder extends ModuleUse {
  private opts: ModuleOptions;
  private bindings: { [name: string]: ContractBinding };
  // @TODO module based event hook - onStart, OnFail etc.
  private readonly contractEvents: Events;
  private actions: { [name: string]: Action };
  private resolver: IModuleRegistryResolver | null;
  private registry: IModuleRegistryResolver | null;

  constructor(opts?: ModuleOptions) {
    super()
    this.opts = {params: {}}
    this.bindings = {}
    this.actions = {}
    this.resolver = null
    this.registry = null
    this.contractEvents = {}

    if (typeof opts !== 'undefined') {
      this.opts = opts as ModuleOptions
    }
  }

  // use links all definitions from the provided Module
  // and returns the provided Module so its' bindings can be used?.
  // use(m: Module, opts?: ModuleOptions): Module;

  contract(name: string, ...args: Arguments): ContractBinding {
    const contractBinding = new ContractBinding(name, args)

    if (checkIfExist(this.bindings[name])) {
      cli.info("Contract already bind to the module - ", name)
      cli.exit(0)
    }

    this.bindings[name] = contractBinding
    return contractBinding
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
  // bindPrototype(name: string, ...args: Arguments): PrototypeBinding;
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
      throw new UserError(`Event with same name is already initialized in module - ${eventName}`)
    }

    this.contractEvents[eventName] = new StatefulEvent(
      event,
      false,
      {}
    )
  }

  getEvent(eventName: string): StatefulEvent {
    if (!checkIfExist(this.contractEvents[eventName])) {
      throw new UserError(`Event with this name ${eventName} doesn't exist.`)
    }

    return this.contractEvents[eventName]
  }

  getAllEvents(): Events {
    return this.contractEvents
  }

  registerAction(name: string, fn: ActionFn): Action {
    const action = new Action(name, fn)
    this.actions[name] = action

    return action
  }

  async bindModule(m: Module): Promise<void> {
    const bindings = m.getAllBindings()

    const networkId = process.env.MORTAR_NETWORK_ID || ""
    const resolver = await m.getRegistry()

    for (let [bindingName, binding] of Object.entries(bindings)) {
      if (checkIfExist(this.bindings[bindingName])) {
        throw new UserError("Conflict when merging two modules, check if their is same binding name.")
      }

      const contractAddress = await resolver?.resolveContract(+networkId, m.name, bindingName)

      this.bindings[bindingName] = new RegistryContractBinding(
        binding.name,
        binding.args,
        binding.bytecode,
        binding.abi,
        {
          contractAddress: contractAddress,
          input: null,
          output: null
        },
        null,
      )
    }
  }

  getBinding(name: string): ContractBinding {
    return this.bindings[name]
  }

  getAllBindings(): { [name: string]: ContractBinding } {
    return this.bindings
  }

  getAllActions(): { [name: string]: Action } {
    return this.actions
  }

  use<T extends Module>(m: T, opts?: ModuleOptions): T {
    this.bindings = m.getAllBindings()
    this.actions = m.getAllActions()

    return m
  }

  setResolver(resolver: IModuleRegistryResolver): void {
    this.resolver = resolver
  }

  getResolver(): IModuleRegistryResolver | null {
    return this.resolver
  }

  setRegistry(registry: IModuleRegistryResolver): void {
    this.registry = registry
  }

  getRegistry(): IModuleRegistryResolver | null {
    return this.registry
  }
}

export class Module {
  readonly name: string;
  private opts: ModuleOptions;
  private readonly bindings: { [name: string]: CompiledContractBinding };
  private readonly events: Events;
  private readonly actions: { [name: string]: Action };
  private registry: IModuleRegistryResolver | null;
  private resolver: IModuleRegistryResolver | null;

  constructor(
    moduleName: string,
    bindings: { [name: string]: CompiledContractBinding },
    events: Events,
    actions: { [name: string]: Action },
    registry: IModuleRegistryResolver | null,
    resolver: IModuleRegistryResolver | null,
  ) {
    this.name = moduleName
    this.opts = {params: {}}
    this.bindings = bindings
    this.bindings = bindings
    this.actions = actions
    this.registry = registry
    this.resolver = resolver
    this.events = events
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

  getAllBindings(): { [name: string]: CompiledContractBinding } {
    return this.bindings
  }

  getAllEvents(): Events {
    return this.events
  }

  getAllActions(): { [name: string]: Action } {
    return this.actions
  }

  getRegistry(): IModuleRegistryResolver | null {
    return this.registry
  }

  setRegistry(registry: IModuleRegistryResolver): void {
    this.registry = registry
  }

  getResolver(): IModuleRegistryResolver | null {
    return this.resolver
  }

  setResolver(resolver: IModuleRegistryResolver): void {
    this.resolver = resolver
  }

  getAction(name: string): Action {
    return this.actions[name]
  }
}

export async function module(moduleName: string, fn: ModuleBuilderFn): Promise<Module> {
  const currentPath = process.cwd()
  const networkId = process.env?.MORTAR_NETWORK_ID || 1 // @TODO think if their is other options for this.

  const moduleBuilder = new ModuleBuilder()
  await fn(moduleBuilder)

  const stateRepo = new ModuleStateRepo(+networkId, currentPath)

  const compiler = new HardhatCompiler()
  const moduleValidator = new ModuleValidator()

  let contractBuildNames: string[] = []
  const moduleBuilderBindings = moduleBuilder.getAllBindings()
  for (let [_, bind] of Object.entries(moduleBuilderBindings)) {
    contractBuildNames.push(bind.name + '.json')
  }

  compiler.compile() // @TODO: make this more suitable for other compilers
  const bytecodes: { [name: string]: string } = compiler.extractBytecode(contractBuildNames)
  if (Object.entries(bytecodes).length != contractBuildNames.length) {
    throw new BytecodeMismatch("some bytecode is missing or .contract() was not used properly")
  }

  const abi: { [name: string]: JsonFragment[] } = compiler.extractContractInterface(contractBuildNames)
  if (Object.entries(abi).length != contractBuildNames.length) {
    throw new AbiMismatch("some abi is missing or .contract() was not used properly")
  }

  moduleValidator.validate(moduleBuilderBindings, abi)

  let newModuleBindings = moduleBuilderBindings as { [p: string]: CompiledContractBinding }

  for (let binding of Object.keys(newModuleBindings)) {
    newModuleBindings[binding].bytecode = bytecodes[binding]
    newModuleBindings[binding].abi = abi[binding]
  }

  return new Module(
    moduleName,
    newModuleBindings,
    moduleBuilder.getAllEvents(),
    moduleBuilder.getAllActions(),
    moduleBuilder.getRegistry(),
    moduleBuilder.getResolver(),
  )
}

