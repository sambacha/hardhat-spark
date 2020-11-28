import {ModuleBucketRepo} from "../packages/modules/bucket_repo";
import {ModuleResolver} from "../packages/modules/module_resolver";
import {HardhatCompiler} from "../packages/ethereum/compiler/hardhat";
import {checkIfExist} from "../packages/utils/util";
import {ModuleValidator} from "../packages/modules/module_validator";
import {JsonFragment} from "../packages/types/abi"
import {TransactionReceipt} from "@ethersproject/abstract-provider";
import {cli} from "cli-ux";

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

// Arguments is the final type that wrapps the Arguments above
// and is the type that is directly used by Bindings and Actions.
export type Arguments = Argument[];

export type ActionFn = (...args: any[]) => void;

export type EventFnDeployed = (b: Binding, ...deps: DeployedContractBinding[]) => void;
export type EventFnCompiled = (b: Binding, ...deps: CompiledContractBinding[]) => void;
export type EventFn = (b: Binding, ...deps: ContractBinding[]) => void;

export type AfterDeployEvent = { fn: EventFnDeployed, deps: ContractBinding[] }

export type ModuleOptions = {
  // Module parameters used to customize Module behavior.
  params: { [name: string]: any }
}

export type ModuleBuilderFn = (m: ModuleBuilder) => void;

export abstract class Binding {
  public name: string;
  public afterDeployEvent: AfterDeployEvent[]

  constructor(name: string) {
    this.name = name
    this.afterDeployEvent = []
  }

  // beforeDeployment executes each time a deployment command is executed.
  beforeDeployment(fn: EventFn, ...bindings: ContractBinding[]): void {

  }

  // afterDeployment executes each time after a deployment has finished.
  // The deployment doesn't actually have to perform any deployments for this event to trigger.
  afterDeployment(fn: EventFnDeployed, ...bindings: ContractBinding[]): void {

  }

  // beforeDeploy runs each time the Binding is about to be triggered.
  // This event can be used to force the binding in question to be deployed.
  beforeDeploy(fn: EventFnCompiled, ...bindings: ContractBinding[]): void {

  }

  // afterDeploy runs after the Binding was deployed.
  afterDeploy(fn: EventFnDeployed, ...bindings: ContractBinding[]): void {
    this.afterDeployEvent.push({
      fn,
      deps: bindings,
    })
  }

  // beforeCompile runs before the source code is compiled.
  beforeCompile(fn: EventFn, ...bindings: ContractBinding[]): void {

  }

  // afterCompile runs after the source code is compiled and the bytecode is available.
  afterCompile(fn: EventFnCompiled, ...bindings: ContractBinding[]): void {

  }

  // // onChange runs after the Binding gets redeployed or changed
  // onChange(fn: RedeployFn): void {
  //
  // }
}

export class ContractBinding extends Binding {
  public args: Arguments;

  constructor(name: string, args: Arguments) {
    super(name)
    this.args = args
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

export type TransactionData = {
  input: TxData | null,
  output: TransactionReceipt | null,
  contractAddress?: string,
}

export class DeployedContractBinding extends CompiledContractBinding {
  public txData: TransactionData

  constructor(
    // metadata
    name: string, args: Arguments, bytecode: string, abi: JsonFragment[], txData: TransactionData,

    // event hooks
    afterDeployEvents: AfterDeployEvent[],
  ) {
    super(name, args, bytecode, abi)
    this.txData = txData

    this.afterDeployEvent = afterDeployEvents
  }

  instance(): any {
    // @TODO return whole contract interface with all its data and metadata
    return {
      contractAddress: this.txData.contractAddress
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

export abstract class ModuleUse {
  abstract use<T extends Module>(m: T, opts?: ModuleOptions): T;
}

export class ModuleBuilder extends ModuleUse {
  private opts: ModuleOptions;
  private bindings: { [name: string]: ContractBinding };
  private actions: { [name: string]: Action };

  constructor(fn: ModuleBuilderFn, opts?: ModuleOptions) {
    super()
    this.opts = {params: {}}
    this.bindings = {}
    this.actions = {}
    if (typeof opts !== 'undefined') {
      this.opts = opts as ModuleOptions
    }

    fn(this)
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
  registerAction(name: string, fn: ActionFn): Action {
    const action = new Action(name, fn)
    this.actions[name] = action

    return action
  }

  // getBinding(name: string): Binding;

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

  // addResolver(resolver: AddressResolver): void;
  //
  // addRegistry(registry: AddressRegistry): void;
}

export class Module {
  private opts: ModuleOptions;
  private bindings: { [name: string]: CompiledContractBinding };
  private actions: { [name: string]: Action };

  constructor(
    bindings: { [name: string]: CompiledContractBinding },
    actions: { [name: string]: Action },
  ) {
    this.opts = {params: {}}
    this.bindings = bindings
    this.actions = actions
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

  getAllActions(): { [name: string]: Action } {
    return this.actions
  }
}

export function module(fn: ModuleBuilderFn): Module {
  const currentPath = process.cwd()

  const moduleBuilder = new ModuleBuilder(fn)
  const moduleBucket = new ModuleBucketRepo(currentPath)
  const moduleResolver = new ModuleResolver()
  const compiler = new HardhatCompiler()
  const moduleValidator = new ModuleValidator()

  let contractBuildNames: string[] = []
  for (let [_, bind] of Object.entries(moduleBuilder.getAllBindings())) {
    contractBuildNames.push(bind.name + '.json')
  }

  compiler.compile() // @TODO: make this more suitable for other compilers
  const bytecodes: { [name: string]: string } = compiler.extractBytecode(contractBuildNames)
  if (Object.entries(bytecodes).length != contractBuildNames.length) {
    cli.error("some bytecode is missing or .contract() was not used properly")
    cli.exit(0)
  }

  const abi: { [name: string]: JsonFragment[] } = compiler.extractContractInterface(contractBuildNames)
  if (Object.entries(abi).length != contractBuildNames.length) {
    cli.error("some abi is missing or .contract() was not used properly")
    cli.exit(0)
  }

  moduleValidator.validate(moduleBuilder.getAllBindings(), abi)

  let oldModuleBucketBindings = moduleBucket.getBucketIfExist() as { [p: string]: CompiledContractBinding }
  if (!checkIfExist(oldModuleBucketBindings)) {
    oldModuleBucketBindings = {}
  }
  let newModuleBindings = moduleBuilder.getAllBindings() as { [p: string]: CompiledContractBinding }

  for (let binding of Object.keys(newModuleBindings)) {
    newModuleBindings[binding].bytecode = bytecodes[binding]
    newModuleBindings[binding].abi = abi[binding]
  }

  if (moduleResolver.checkIfDiff(oldModuleBucketBindings, newModuleBindings)) {
    moduleResolver.printDiffParams(oldModuleBucketBindings, newModuleBindings)
  } else {
    cli.info("Nothing changed from last revision.")
    cli.exit(0)
  }

  return new Module(
    newModuleBindings,
    moduleBuilder.getAllActions()
  )
}

