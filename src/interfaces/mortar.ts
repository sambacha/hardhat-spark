import {ModuleStateRepo} from "../packages/modules/state_repo";
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

export type RedeployFn = (b: Binding, ...deps: DeployedContractBinding[]) => Promise<DeployedContractBinding[]>;

export type EventFnDeployed = (b: Binding, ...deps: DeployedContractBinding[]) => Promise<DeployedContractBinding[]>;
export type EventFnCompiled = (b: Binding, ...deps: CompiledContractBinding[]) => void;
export type EventFn = (b: Binding, ...deps: ContractBinding[]) => void;

export type BeforeDeployEvent = { fn: EventFnCompiled, deps: ContractBinding[] }
export type AfterDeployEvent = { fn: EventFnDeployed, deps: ContractBinding[] }
export type BeforeCompileEvent = { fn: EventFn, deps: ContractBinding[] }
export type AfterCompileEvent = { fn: EventFnCompiled, deps: ContractBinding[] }
export type OnChangeEvent = { fn: RedeployFn, deps: ContractBinding[] }

export type Events = {
  beforeCompile: BeforeCompileEvent[]
  afterCompile: AfterCompileEvent[]
  beforeDeployment: BeforeDeployEvent[]
  afterDeployment: AfterDeployEvent[]
  beforeDeploy: BeforeDeployEvent[]
  afterDeploy: AfterDeployEvent[]
  onChange: OnChangeEvent[]
}

export type ModuleOptions = {
  // Module parameters used to customize Module behavior.
  params: { [name: string]: any }
}

export type ModuleBuilderFn = (m: ModuleBuilder) => Promise<void>;

export abstract class Binding {
  public name: string;
  public events: Events

  constructor(name: string) {
    this.name = name
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

  instance(): any {
    return {
      name: this.name
    }
  }

  // beforeDeployment executes each time a deployment command is executed.
  beforeDeployment(fn: EventFnCompiled, ...bindings: ContractBinding[]): void {
    this.events.beforeDeployment.push({
      fn,
      deps: bindings,
    })
  }

  // afterDeployment executes each time after a deployment has finished.
  // The deployment doesn't actually have to perform any deployments for this event to trigger.
  afterDeployment(fn: EventFnDeployed, ...bindings: ContractBinding[]): void {
    this.events.afterDeployment.push({
      fn,
      deps: bindings,
    })
  }

  // beforeDeploy runs each time the Binding is about to be triggered.
  // This event can be used to force the binding in question to be deployed.
  beforeDeploy(fn: EventFnCompiled, ...bindings: ContractBinding[]): void {
    this.events.beforeDeploy.push({
      fn,
      deps: bindings,
    })
  }

  // afterDeploy runs after the Binding was deployed.
  afterDeploy(fn: EventFnDeployed, ...bindings: ContractBinding[]): void {
    this.events.afterDeploy.push({
      fn,
      deps: bindings,
    })
  }

  // beforeCompile runs before the source code is compiled.
  beforeCompile(fn: EventFn, ...bindings: ContractBinding[]): void {
    this.events.beforeCompile.push({
      fn,
      deps: bindings,
    })
  }

  // afterCompile runs after the source code is compiled and the bytecode is available.
  afterCompile(fn: EventFnCompiled, ...bindings: ContractBinding[]): void {
    this.events.afterCompile.push({
      fn,
      deps: bindings,
    })
  }

  // onChange runs after the Binding gets redeployed or changed
  onChange(fn: RedeployFn, ...bindings: ContractBinding[]): void {
    this.events.onChange.push({
      fn,
      deps: bindings
    })
  }
}

export class ContractBinding extends Binding {
  public args: Arguments;

  constructor(name: string, args: Arguments) {
    super(name)
    this.args = args
  }

  instance(): any {
    return {
      name: this.name,
      args: this.args
    }
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

  instance(): any {
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
  contractInput: ContractInput[]
  contractOutput: TransactionResponse[]
}

export class DeployedContractBinding extends CompiledContractBinding {
  public txData: TransactionData
  public contractTxProgress: number

  private readonly signer: ethers.Signer
  private readonly prompter: Prompter
  private readonly txGenerator: EthTxGenerator

  constructor(
    // metadata
    name: string, args: Arguments, bytecode: string, abi: JsonFragment[], txData: TransactionData,
    // event hooks
    events: Events,
    signer: ethers.Signer,
    prompter: Prompter,
    txGenerator: EthTxGenerator
  ) {
    super(name, args, bytecode, abi)
    this.txData = txData
    this.contractTxProgress = 0

    this.events = events
    this.signer = signer
    this.prompter = prompter
    this.txGenerator = txGenerator
  }

  instance(): ethers.Contract {
    return new ContractInstance(
      this,
      <string>this.txData.contractAddress,
      this.abi,
      this.signer,
      this.prompter,
      this.txGenerator) as unknown as ethers.Contract
  }
}

export class ContractInstance {
  private readonly deployedBinding: DeployedContractBinding
  private readonly prompter: Prompter
  private ExecutedContractTx: number

  [key: string]: any;

  constructor(
    deployedBinding: DeployedContractBinding,
    contractAddress: string,
    abi: JsonFragment[],
    signer: ethers.Signer,
    prompter: Prompter,
    txGenerator: EthTxGenerator
  ) {
    this.prompter = prompter
    this.txGenerator = txGenerator
    this.deployedBinding = deployedBinding
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

    if (!checkIfExist(this.deployedBinding.txData.contractInput)) {
      this.deployedBinding.txData.contractInput = []
    }

    if (!checkIfExist(this.deployedBinding.txData.contractOutput)) {
      this.deployedBinding.txData.contractOutput = []
    }

    this.ExecutedContractTx = this.deployedBinding.txData.contractOutput.length
  }

  private buildDefaultWrapper(contractFunction: ContractFunction, fragment: FunctionFragment): ContractFunction {
    return async (...args: Array<any>): Promise<TransactionResponse> => {
      // allow user to override ethers with his override params

      if (args.length === fragment.inputs.length + 1 && typeof (args[args.length - 1]) === "object") {
        return await contractFunction(...args)
      }

      let contractTxIterator = this.deployedBinding.contractTxProgress

      const currentInputs = this.deployedBinding.txData.contractInput[contractTxIterator]
      const contractOutput = this.deployedBinding.txData.contractOutput[contractTxIterator]

      if (checkIfExist(currentInputs) &&
        checkIfSameInputs(currentInputs, fragment.name, args) && checkIfExist(contractOutput)) {
        cli.info("Contract function already executed: ", fragment.name, ...args ,"... skipping")

        this.deployedBinding.contractTxProgress = ++contractTxIterator
        return contractOutput
      }

      if (
        (checkIfExist(currentInputs) && !checkIfSameInputs(currentInputs, fragment.name, args)) ||
        !checkIfExist(currentInputs)
      ) {
        this.deployedBinding.txData.contractInput[contractTxIterator] = {
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

      this.deployedBinding.txData.contractOutput[contractTxIterator] = tx
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

export abstract class ModuleUse {
  abstract use<T extends Module>(m: T, opts?: ModuleOptions): T;
}

export class ModuleBuilder extends ModuleUse {
  private opts: ModuleOptions;
  private bindings: { [name: string]: ContractBinding };
  private actions: { [name: string]: Action };

  private moduleFunction: ModuleBuilderFn

  constructor(fn: ModuleBuilderFn, opts?: ModuleOptions) {
    super()
    this.opts = {params: {}}
    this.bindings = {}
    this.actions = {}
    if (typeof opts !== 'undefined') {
      this.opts = opts as ModuleOptions
    }

    this.moduleFunction = fn
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

  bindModule(m: Module): void {
    const bindings = m.getAllBindings()
    const actions = m.getAllActions()

    for (let [bindingName, binding] of Object.entries(bindings)) {
      if (!checkIfExist(this.bindings[bindingName])) {
        this.bindings[bindingName] = binding
      }
    }

    for (let [actionName, action] of Object.entries(actions)) {
      if (!checkIfExist(this.actions[actionName])) {
        this.actions[actionName] = action
      }
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

  async triggerModuleBuilderFn(): Promise<void> {
    await this.moduleFunction(this)

    return
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

  getAction(name: string): Action {
    return this.actions[name]
  }
}

export async function module(moduleName: string, fn: ModuleBuilderFn): Promise<Module> {
  const currentPath = process.cwd()
  const networkId = process.env?.MORTAR_NETWORK_ID || 1 // @TODO think if their is other options for this.

  const provider = new ethers.providers.JsonRpcProvider(); // @TODO: change this to fetch from config

  const configService = new ConfigService(currentPath)
  const moduleBuilder = new ModuleBuilder(fn)
  await moduleBuilder.triggerModuleBuilderFn()

  const gasCalculator = new GasCalculator(provider)
  const txGenerator = await new EthTxGenerator(configService, gasCalculator, +networkId, provider)

  const prompter = new Prompter()
  const moduleResolver = new ModuleResolver(provider, configService.getPrivateKey(), prompter, txGenerator)
  const stateRepo = new ModuleStateRepo(+networkId, currentPath, moduleResolver)
  const compiler = new HardhatCompiler()
  const moduleValidator = new ModuleValidator()

  let contractBuildNames: string[] = []
  const moduleBuilderBindings = moduleBuilder.getAllBindings()
  for (let [bindingName, bind] of Object.entries(moduleBuilderBindings)) {
    contractBuildNames.push(bind.name + '.json')

    await EventHandler.executeBeforeCompileEventHook(bind, moduleBuilderBindings)
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

  moduleValidator.validate(moduleBuilder.getAllBindings(), abi)

  let oldModuleStateBindings = stateRepo.getStateIfExist(moduleName) as { [p: string]: CompiledContractBinding }
  if (!checkIfExist(oldModuleStateBindings)) {
    oldModuleStateBindings = {}
  }
  let newModuleBindings = moduleBuilder.getAllBindings() as { [p: string]: CompiledContractBinding }

  for (let binding of Object.keys(newModuleBindings)) {
    newModuleBindings[binding].bytecode = bytecodes[binding]
    newModuleBindings[binding].abi = abi[binding]
    await EventHandler.executeAfterCompileEventHook(newModuleBindings[binding], newModuleBindings)
  }

  if (!moduleResolver.checkIfDiff(oldModuleStateBindings, newModuleBindings)) {
    cli.info("Nothing changed from last revision.")
  }

  return new Module(
    newModuleBindings,
    moduleBuilder.getAllActions()
  )
}

