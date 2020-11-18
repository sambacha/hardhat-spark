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

export type ActionFn = (...args: any[]) => void;

export type ModuleOptions = {
  // Module parameters used to customize Module behavior.
  params: { [name: string]: any }
}

export type ModuleBuilderFn = (m: ModuleBuilder) => void;

export abstract class Binding {
  public name: string;

  constructor(name: string) {
    this.name = name
  }
}

export class ContractBinding extends Binding {
  public args: Arguments;

  constructor(name: string, args: Arguments) {
    super(name)
    this.args = args
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

export abstract class ModuleUse {
  abstract use<T extends Module>(m: T, opts?: ModuleOptions): T;
}

export class ModuleBuilder extends ModuleUse {
  private opts: ModuleOptions;
  private bindings: { [name: string]: Binding };
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

  bind(name: string, ...args: Arguments): ContractBinding {
    const contractBinding = new ContractBinding(name, args)
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
    this.bindings[name] = action

    return action
  }

  // getBinding(name: string): Binding;

  getAllBindings(): { [name: string]: Binding } {
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
  private bindings: { [name: string]: Binding };
  private actions: { [name: string]: Action };

  constructor(
    bindings: { [name: string]: Binding },
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

  getAllBindings(): { [name: string]: Binding } {
    return this.bindings
  }

  getAllActions(): { [name: string]: Action } {
    return this.actions
  }
}

export function module(fn: ModuleBuilderFn): Module {
  const moduleBuilder = new ModuleBuilder(fn)

  return new Module(
    moduleBuilder.getAllBindings(),
    moduleBuilder.getAllActions()
  )
}

