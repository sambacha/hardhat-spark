import {
  CompiledContractBinding,
  DeployedContractBinding,
  Events,
  StatefulEvent,
  ContractBinding, ModuleEvents, ModuleEvent, ContractEvent,
} from '../../interfaces/mortar';
import { checkIfExist } from '../utils/util';
import { cli } from 'cli-ux';
import { ethers } from 'ethers';
import { Prompter } from '../prompter';
import { EthTxGenerator } from '../ethereum/transactions/generator';
import { UserError } from '../types/errors';
import { ModuleState } from './states/module';
import { ModuleStateRepo } from './states/state_repo';

export class ModuleResolver {
  private readonly signer: ethers.Wallet;
  private readonly prompter: Prompter;
  private readonly txGenerator: EthTxGenerator;
  private readonly moduleStateRepo: ModuleStateRepo;

  constructor(provider: ethers.providers.JsonRpcProvider, privateKey: string, prompter: Prompter, txGenerator: EthTxGenerator, moduleStateRepo: ModuleStateRepo) {
    this.signer = new ethers.Wallet(privateKey, provider);
    this.prompter = prompter;
    this.txGenerator = txGenerator;
    this.moduleStateRepo = moduleStateRepo;
  }

  checkIfDiff(oldModuleState: ModuleState, newModuleStates: ModuleState): boolean {
    // @TODO(filip): be more specific about type of conflict. What fields needs to mismatch in order to consider this different
    // if args match also

    let oldBindingsLength = 0;
    let newBindingsLength = 0;
    if (checkIfExist(oldModuleState)) {
      oldBindingsLength = Object.keys(oldModuleState).length;
    }
    if (checkIfExist(newModuleStates)) {
      newBindingsLength = Object.keys(newModuleStates).length;
    }

    if (newBindingsLength != oldBindingsLength) {
      return true;
    }

    let i = 0;
    while (i < oldBindingsLength) {
      let oldModuleElement: DeployedContractBinding | StatefulEvent = oldModuleState[Object.keys(oldModuleState)[i]];
      let newModuleElement: CompiledContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(oldModuleElement?.bytecode) && checkIfExist(newModuleElement?.bytecode)) {
        oldModuleElement = (oldModuleElement as DeployedContractBinding);
        newModuleElement = (newModuleElement as CompiledContractBinding);

        if (oldModuleElement.bytecode != newModuleElement.bytecode) {
          return true;
        }

        if (!checkArgs(oldModuleElement.args, newModuleElement.args)) {
          return true;
        }

        i++;
        continue;
      }

      oldModuleElement = (oldModuleElement as StatefulEvent);
      newModuleElement = (newModuleElement as StatefulEvent);

      if (oldModuleElement.event.name != newModuleElement.event.name) {
        return true;
      }

      i++;
    }

    return false;
  }

  printDiffParams(oldModuleStates: ModuleState, newModuleStates: ModuleState): void {
    if (!this.checkIfDiff(oldModuleStates, newModuleStates)) {
      return;
    }

    let oldModuleStatesLength = 0;
    let newModuleStatesLength = 0;
    if (checkIfExist(oldModuleStates)) {
      oldModuleStatesLength = Object.keys(oldModuleStates).length;
    }
    if (checkIfExist(newModuleStates)) {
      newModuleStatesLength = Object.keys(newModuleStates).length;
    }
    if (newModuleStatesLength < oldModuleStatesLength) {
      cli.info('Currently deployed module is bigger than current module.');
      cli.exit(0);
    }

    let i = 0;
    while (i < oldModuleStatesLength) {
      let oldModuleElement: DeployedContractBinding | StatefulEvent = oldModuleStates[Object.keys(oldModuleStates)[i]];
      let newModuleElement: CompiledContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(oldModuleElement?.bytecode) && checkIfExist(newModuleElement?.bytecode)) {
        oldModuleElement = oldModuleElement as DeployedContractBinding;
        newModuleElement = newModuleElement as CompiledContractBinding;

        if (oldModuleElement.bytecode != newModuleElement.bytecode) {
          cli.info('~', newModuleElement.name);
          printArgs(newModuleElement.args, '  ');
        }

        i++;
        continue;
      }

      i++;
    }

    while (i < newModuleStatesLength) {
      let newModuleElement: CompiledContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(newModuleElement?.bytecode) && checkIfExist(newModuleElement?.bytecode)) {
        newModuleElement = newModuleElement as CompiledContractBinding;

        cli.info('+', newModuleElement.name);
        printArgs(newModuleElement.args, '  ');
      }
      i++;
    }

    return;
  }

  resolve(
    currentBindings: { [p: string]: CompiledContractBinding },
    currentEvents: Events,
    moduleEvents: ModuleEvents,
    moduleStateFile: ModuleState,
  ): ModuleState {
    let moduleState: { [p: string]: CompiledContractBinding | StatefulEvent } = {};

    for (const [bindingName, binding] of Object.entries(currentBindings)) {
      if (checkIfExist(moduleState[bindingName])) {
        continue;
      }

      moduleState = ModuleResolver.resolveContractsAndEvents(moduleState, currentBindings, binding, currentEvents, moduleEvents);
    }

    let moduleStateLength = 0;
    if (checkIfExist(moduleState)) {
      moduleStateLength = Object.keys(moduleState).length;
    }

    const resolvedModuleState: ModuleState = {};
    let i = 0;
    const moduleElementNames = Object.keys(moduleState);
    while (i < moduleStateLength) {
      const moduleElementName = moduleElementNames[i];
      const moduleStateElement = moduleState[moduleElementName];

      let stateFileElement = moduleStateFile[moduleElementName];
      stateFileElement = stateFileElement as DeployedContractBinding;
      if (checkIfExist(stateFileElement) && checkIfExist(stateFileElement?.bytecode)) {
        if (!(moduleStateElement instanceof ContractBinding)) {
          throw new UserError("Module and module state file didn't match element.");
        }

        if (stateFileElement.bytecode != moduleStateElement.bytecode || !checkIfExist(stateFileElement.txData?.contractAddress)) {
          const txData = (moduleStateElement as DeployedContractBinding)?.txData || {};
          resolvedModuleState[moduleElementName] = new DeployedContractBinding(
            // current metadata
            moduleStateElement.name,
            moduleStateElement.contractName,
            moduleStateElement.args,
            moduleStateElement.bytecode,
            moduleStateElement.abi,
            moduleStateElement.libraries,
            txData,

            // event hooks
            moduleStateElement.eventsDeps,
            this.signer,
            this.prompter,
            this.txGenerator,
            this.moduleStateRepo
          );

          i++;
          continue;
        }

        resolvedModuleState[moduleElementName] = new DeployedContractBinding(
          // current metadata
          stateFileElement.name,
          stateFileElement.contractName,
          stateFileElement.args,
          stateFileElement.bytecode,
          stateFileElement.abi,
          stateFileElement.libraries,
          stateFileElement.txData,

          // event hooks
          moduleStateElement.eventsDeps,
          this.signer,
          this.prompter,
          this.txGenerator,
          this.moduleStateRepo
        );
        i++;
        continue;
      }

      stateFileElement = stateFileElement as unknown as StatefulEvent;
      if (checkIfExist(stateFileElement) && checkIfExist(stateFileElement.event)) {
        if (!(moduleStateElement instanceof StatefulEvent)) {
          throw new UserError("Module and module state file didn't match element.");
        }

        stateFileElement.event = moduleStateElement.event;
        resolvedModuleState[moduleElementName] = stateFileElement;

        i++;
        continue;
      }

      if (moduleStateElement instanceof ContractBinding) {
        const txData = (moduleStateElement as DeployedContractBinding)?.txData || {};
        resolvedModuleState[moduleElementName] = new DeployedContractBinding(
          // current metadata
          moduleStateElement.name,
          moduleStateElement.contractName,
          moduleStateElement.args,
          moduleStateElement.bytecode,
          moduleStateElement.abi,
          moduleStateElement.libraries,
          txData,

          // event hooks
          moduleStateElement.eventsDeps,
          this.signer,
          this.prompter,
          this.txGenerator,
          this.moduleStateRepo
        );
      }

      if (moduleStateElement instanceof StatefulEvent) {
        resolvedModuleState[moduleElementName] = moduleStateElement;
      }

      i++;
    }

    return resolvedModuleState;
  }

  private static resolveContractsAndEvents(
    moduleState: { [p: string]: CompiledContractBinding | StatefulEvent },
    bindings: { [p: string]: CompiledContractBinding },
    binding: CompiledContractBinding,
    events: Events,
    moduleEvents: ModuleEvents,
  ): { [p: string]: CompiledContractBinding | StatefulEvent } {
    if (checkIfExist(moduleState[binding.name])) {
      return moduleState;
    }

    for (const arg of binding.args) {
      if (!checkIfExist(arg?.name)) {
        continue;
      }
      const argBinding = bindings[arg.name];
      if (!checkIfExist(argBinding)) {
        continue;
      }

      this.resolveContractsAndEvents(moduleState, bindings, argBinding, events, moduleEvents);
    }

    for (const [bindingName] of Object.entries(binding.libraries)) {
      const libBinding = bindings[bindingName];
      if (!checkIfExist(libBinding)) {
        continue;
      }

      this.resolveContractsAndEvents(moduleState, bindings, libBinding, events, moduleEvents);
    }

    this.handleModuleEvents(moduleState, moduleEvents.onStart);
    this.resolveBeforeDeployEvents(moduleState, binding, bindings, events, moduleEvents);
    moduleState[binding.name] = binding;
    this.resolveAfterDeployEvents(moduleState, binding, bindings, events, moduleEvents);

    return moduleState;
  }

  private static resolveBeforeDeployEvents(
    moduleState: { [p: string]: CompiledContractBinding | StatefulEvent },
    binding: CompiledContractBinding,
    bindings: { [p: string]: CompiledContractBinding },
    events: Events,
    moduleEvents: ModuleEvents,
  ): void {
    const addEvent = (eventName: string) => {
      if (checkIfExist(moduleState[eventName])) {
        return;
      }

      for (const eventDep of (events[eventName].event as ContractEvent).eventDeps) {
        for (const binding of eventDep.deps) {
          if (checkIfExist(moduleState[binding.name])) {
            continue;
          }

          this.resolveContractsAndEvents(moduleState, bindings, bindings[binding.name], events, moduleEvents);
        }
      }

      moduleState[eventName] = events[eventName];
    };

    for (const eventIndex in binding.eventsDeps.beforeCompile) {
      const eventName = binding.eventsDeps.beforeCompile[eventIndex];

      addEvent(eventName);
    }

    for (const eventIndex in binding.eventsDeps.afterCompile) {
      const eventName = binding.eventsDeps.afterCompile[eventIndex];

      addEvent(eventName);
    }

    for (const eventIndex in binding.eventsDeps.beforeDeployment) {
      const eventName = binding.eventsDeps.beforeDeployment[eventIndex];

      addEvent(eventName);
    }

    for (const eventIndex in binding.eventsDeps.beforeDeploy) {
      const eventName = binding.eventsDeps.beforeDeploy[eventIndex];

      addEvent(eventName);
    }
  }

  private static resolveAfterDeployEvents(
    moduleState: { [p: string]: CompiledContractBinding | StatefulEvent },
    binding: CompiledContractBinding,
    bindings: { [p: string]: CompiledContractBinding },
    events: Events,
    moduleEvents: ModuleEvents,
  ): void {
    const handleEvent = (eventName: string) => {
      if ((events[eventName].event as ContractEvent).deps.length == 0) {
        return;
      }

      for (const dep of (events[eventName].event as ContractEvent).deps) {
        if (!checkIfExist(moduleState[dep.name])) {
          return;
        }
      }

      for (const eventDep of (events[eventName].event as ContractEvent).eventDeps) {
        for (const b of eventDep.deps) {
          if (checkIfExist(moduleState[b.name])) {
            continue;
          }

          this.resolveContractsAndEvents(moduleState, bindings, bindings[b.name], events, moduleEvents);
        }
      }

      moduleState[eventName] = events[eventName];
    };

    for (const eventIndex in binding.eventsDeps.afterDeploy) {
      handleEvent(binding.eventsDeps.afterDeploy[eventIndex]);
    }

    for (const eventIndex in binding.eventsDeps.onChange) {
      handleEvent(binding.eventsDeps.onChange[eventIndex]);
    }

    for (const eventIndex in binding.eventsDeps.afterDeployment) {
      handleEvent(binding.eventsDeps.afterDeployment[eventIndex]);
    }
  }

  static handleModuleEvents(
    moduleState: ModuleState | { [p: string]: CompiledContractBinding | StatefulEvent },
    moduleEvents: { [name: string]: ModuleEvent },
  ) {
    for (const [eventName, moduleEvent] of Object.entries(moduleEvents)) {
      moduleState[eventName] = new StatefulEvent(
        moduleEvent,
        false,
        {}
      );
    }
  }
}

function printArgs(args: any[], indent: string): void {
  if (args.length != 0) {
    for (const arg of args) {
      // @TODO: make this prettier
      if (checkIfExist(arg.name)) {
        cli.info(indent + '└── ' + arg.name);
        return printArgs(arg.args, indent + '  ');
      }
    }
  }

  return;
}

function checkArgs(currentArgs: any[], deployedArgs: any[]): boolean {
  const currentArgsLen = currentArgs.length;
  const deployedArgsLen = deployedArgs.length;

  if (currentArgsLen != deployedArgsLen) {
    return false;
  }

  let i = 0;
  while (i < currentArgsLen) {

    if (currentArgs[i] != deployedArgs[i]) {
      return false;
    }

    if (
      checkIfExist(currentArgs[i].args) &&
      checkIfExist(deployedArgs[i].args) &&
      !checkArgs(currentArgs[i].args, deployedArgs[i].args)
    ) {
      return false;
    }

    i++;
  }

  return true;
}

