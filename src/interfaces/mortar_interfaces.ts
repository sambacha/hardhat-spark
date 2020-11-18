// This is desired functionality that

// AutoBinding is a special type of binding that extends the Binding
// type and automatically detects which binding to instantiate for
// a given value.
//
// It is in place primarily to support directly providing JS primitives
// instead of manually wrapping each in a ValueBinding.

// import {ModuleUse} from "./generated";

export type AutoBinding = any | Binding;

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

export abstract class Event {
}

export type EventFn = (e: Event, b: Binding, ...deps: Binding[]) => void;

export type RedeployFn = (b: Binding, dependency: Binding) => void;

export abstract class Binding {
  public name: string;

  constructor(name: string);

  // instance returns the actual instance of the Binding.
  // In case of Contracts, returns a deployed Contract instance.
  // In case of Values, returns the actual value.
  // In case of Function, evaluatets the function and returns the resulting Binding instance.
  // @TODO: Think about this in more detail, but this is a potentially good option to put Mortar brains.
  instance(): any;

  // @TODO: Define complete set of lifecycle events.
  // Example: Deployment Start -> Planning Before -> Planning After
  //      -> onChange -> Apply Before -> Apply After -> Deployment End.

  // beforeDeployment executes each time a deployment command is executed.
  beforeDeployment(fn: EventFn, ...bindings: Binding[]): void;

  // afterDeployment executes each time after a deployment has finished.
  // The deployment doesn't actually have to perform any deployments for this event to trigger.
  afterDeployment(fn: EventFn, ...bindings: Binding[]): void;

  // beforeDeploy runs each time the Binding is about to be triggered.
  // This event can be used to force the binding in question to be deployed.
  beforeDeploy(fn: EventFn, ...bindings: Binding[]): void;

  // afterDeploy runs after the Binding was deployed.
  afterDeploy(fn: EventFn, ...bindings: Binding[]): void;

  // beforeCompile runs before the source code is compiled.
  beforeCompile(fn: EventFn, ...bindings: Binding[]): void;

  // afterCompile runs after the source code is compiled and the bytecode is available.
  afterCompile(fn: EventFn, ...bindings: Binding[]): void;

  // onChange runs after the Binding gets redeployed or changed
  onChange(fn: RedeployFn): void;
}

export class ContractBinding extends Binding {
  public args: Arguments;

  constructor(name: string, args: Arguments);
}

export class DeployedBinding extends Binding {
  public network?: string;
  public address: string;

  constructor(name: string, address: string, network?: string);
}

export class ValueBinding extends Binding {
  public val: any;

  constructor(name: string, val: any);
}

export type LazyFn = (...args: Binding[]) => Binding;

export class LazyBinding extends Binding {
  public fn: LazyFn;

  constructor(name: string, fn: LazyFn, ...args: Binding[]);
}

// PrototypeBindings are the same thing as ContractBinding,
// with an important difference that PrototypeBinding won't
// be deployed.
export class PrototypeBinding extends ContractBinding {
}

export class FactoryPrototypeBinding extends PrototypeBinding {
  public factory: ContractBinding;
  public method: string;

  constructor(name: string, factory: ContractBinding, method: string, args: Arguments);
}

export class AliasedBinding extends Binding {
  public binding: Binding;

  constructor(alias: string, binding: Binding);
}

export class ContractConstBinding extends Binding {
  public contract: ContractBinding;
  public constName: string;
  public constValue: Binding;

  constructor(contract: ContractBinding, constName: string, constValue: Binding);
}

export class ModuleParamBinding extends Binding {
  public defaultValue?: any;

  constructor(name: string, defaultValue?: any);
}

export interface AutoBindOptions {
  // An array of glob patterns which define where to look for contracts to automatically bind.
  targets: string[];

  // Bindings which will be used as defaults when constructor arguments are bound.
  arguments?: NamedArguments;

  // An array of glob patterns which define which contracts to exclude from automatic binding.
  excludes?: string[];
}

export type ActionFn = (...args: any[]) => void;

export class Action {
  public name: string;
  public action: ActionFn;

  constructor(name: string, action: ActionFn);
}

export interface AddressResolver {
  resolve(network: string, contract: string | Binding): string;
}

export interface AddressRegistry extends AddressResolver {
  register(network: string, contract: ContractBinding, address: string): void;
}

export class ArtifactsDirRegistry implements AddressRegistry {
  public dirPath: string; // Default: ./artifacts relative to mortar working directory.

  register(network: string, contract: ContractBinding, address: string): void;

  resolve(network: string, contract: string | Binding): string;
}

export class DeploymentInfoArtifactRegistry implements AddressRegistry {
  public path: string; // Default: ./mortarDeployInfo.json relative to the mortar working directory.

  register(network: string, contract: ContractBinding, address: string): void;

  resolve(network: string, contract: string | Binding): string;
}

export class GithubReleasesRegistry implements AddressRegistry {
  public repoUrl: string;

  register(network: string, contract: ContractBinding, address: string): void;

  resolve(network: string, contract: string | Binding): string;
}

export class IPFSRegistry implements AddressRegistry {
  public ipnsAddress: string;

  register(network: string, contract: ContractBinding, address: string): void;

  resolve(network: string, contract: string | Binding): string;
}

export type ModuleOptions = {
  // Module parameters used to customize Module behavior.
  params: { [name: string]: any }
}

export type ModuleBuilderFn = (m: ModuleBuilder) => void;

export class ModuleBuilder extends ModuleUse {
  private opts: ModuleOptions;
  private bindings: { [name: string]: Binding };
  private actions: { [name: string]: Action };

  private addrResolvers: AddressResolver[];
  private addrRegistries: AddressRegistry[];

  constructor(fn: ModuleBuilderFn, opts?: ModuleOptions);

  // use links all definitions from the provided Module
  // and returns the provided Module so its' bindings can be used?.
  // use(m: Module, opts?: ModuleOptions): Module;

  bind(name: string, ...args: Arguments): ContractBinding

  bindDeployed(name: string, address: string, network?: string): DeployedBinding;

  // name = instance contract name.
  // factory = factory which is called.
  // method = factory method name.
  // args = any args common to all instances.
  bindFactory(name: string, factory: ContractBinding, method: string, ...args: Arguments): FactoryPrototypeBinding;

  bindAlias(alias: string, binding: Binding, force?: boolean): AliasedBinding

  bindPrototype(name: string, ...args: Arguments): PrototypeBinding;

  bindCopy(name: string, proto: ContractBinding, ...override: Arguments): ContractBinding;

  bindValue(name: string, val: any): ValueBinding

  bindParam(name: string, defaultValue?: any): ModuleParamBinding;

  bindLazy(name: string, fn: LazyFn): LazyBinding;

  bindContractConst(contract: ContractBinding, constName: string, constValue: Binding): ContractConstBinding;

  autoBind(opts: AutoBindOptions): Binding[];

  registerAction(name: string, fn: ActionFn): Action;

  getBinding(name: string): Binding;

  addResolver(resolver: AddressResolver): void;

  addRegistry(registry: AddressRegistry): void;
}

export type ModuleEventFn = (e: Event, m: Module, ...deps: Binding[]) => void;
export type ModuleAfterEachFn = (e: Event, m: Module, b: Binding, ...deps: Binding[]) => void;

export class Module {
  private opts: ModuleOptions;
  private bindings: { [name: string]: Binding };
  private actions: { [name: string]: Action }

  call(name: string, ...args: any[]): void;

  getBinding(name: string): Binding;

  beforeDeploy(fn: ModuleEventFn, ...bindings: Binding[]): void;

  afterDeploy(fn: ModuleEventFn, ...bindings: Binding[]): void;

  afterEach(fn: ModuleAfterEachFn, ...bindings: Binding[]): void;
}

export function module(fn: ModuleBuilderFn): Module;

export function deploy(module: Module, opts?: ModuleOptions): Module;
