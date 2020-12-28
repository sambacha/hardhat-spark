import {
  Events,
  StatefulEvent,
  ContractBinding, ModuleEvents, ModuleEvent, ContractEvent, EventsDepRef,
} from '../../interfaces/mortar';
import { checkIfExist } from '../utils/util';
import { cli } from 'cli-ux';
import { ethers } from 'ethers';
import { Prompter } from '../prompter';
import { EthTxGenerator } from '../ethereum/transactions/generator';
import { UserError } from '../types/errors';
import { ModuleState } from './states/module';
import { ModuleStateRepo } from './states/state_repo';
import { SingleContractLinkReference } from '../types/artifacts/libraries';

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
      let oldModuleElement: ContractBinding | StatefulEvent = oldModuleState[Object.keys(oldModuleState)[i]];
      let newModuleElement: ContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(oldModuleElement?.bytecode) && checkIfExist(newModuleElement?.bytecode)) {
        oldModuleElement = (oldModuleElement as ContractBinding);
        newModuleElement = (newModuleElement as ContractBinding);

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
      let oldModuleElement: ContractBinding | StatefulEvent = oldModuleStates[Object.keys(oldModuleStates)[i]];
      let newModuleElement: ContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(oldModuleElement?.bytecode) && checkIfExist(newModuleElement?.bytecode)) {
        oldModuleElement = oldModuleElement as ContractBinding;
        newModuleElement = newModuleElement as ContractBinding;

        if (oldModuleElement.bytecode != newModuleElement.bytecode) {
          cli.info('~', newModuleElement.name);
          printArgs(newModuleElement.args, '  ');
          printEvents(newModuleElement.eventsDeps, '  ');
        }

        i++;
        continue;
      }

      i++;
    }

    while (i < newModuleStatesLength) {
      let newModuleElement: ContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(newModuleElement?.bytecode) && checkIfExist(newModuleElement?.bytecode)) {
        newModuleElement = newModuleElement as ContractBinding;

        cli.info('+', newModuleElement.name);
        printArgs(newModuleElement.args, '  ');
        printEvents(newModuleElement.eventsDeps, '  ');
      }
      i++;
    }

    return;
  }

  resolve(
    currentBindings: { [p: string]: ContractBinding },
    currentEvents: Events,
    moduleEvents: ModuleEvents,
    moduleStateFile: ModuleState,
  ): ModuleState {
    let resolvedModuleElements: { [p: string]: ContractBinding | StatefulEvent } = {};

    for (const [bindingName, binding] of Object.entries(currentBindings)) {
      if (checkIfExist(resolvedModuleElements[bindingName])) {
        continue;
      }

      resolvedModuleElements = ModuleResolver.resolveContractsAndEvents(resolvedModuleElements, currentBindings, binding, currentEvents, moduleEvents);
    }

    let moduleStateLength = 0;
    if (checkIfExist(resolvedModuleElements)) {
      moduleStateLength = Object.keys(resolvedModuleElements).length;
    }

    const resolvedModuleState: ModuleState = {};
    let i = 0;
    const moduleElementNames = Object.keys(resolvedModuleElements);
    while (i < moduleStateLength) {
      const moduleElementName = moduleElementNames[i];
      const resolvedModuleStateElement = resolvedModuleElements[moduleElementName];

      let stateFileElement = moduleStateFile[moduleElementName];
      stateFileElement = stateFileElement as ContractBinding;
      if (checkIfExist(stateFileElement) && checkIfExist(stateFileElement?.bytecode)) {
        if (!(resolvedModuleStateElement instanceof ContractBinding)) {
          throw new UserError("Module and module state file didn't match element.");
        }

        if (stateFileElement.bytecode != resolvedModuleStateElement.bytecode || !checkIfExist(stateFileElement.txData?.contractAddress)) {
          resolvedModuleStateElement.signer = this.signer;
          resolvedModuleStateElement.prompter = this.prompter;
          resolvedModuleStateElement.txGenerator = this.txGenerator;
          resolvedModuleStateElement.moduleStateRepo = this.moduleStateRepo;

          resolvedModuleState[moduleElementName] = resolvedModuleStateElement;
        } else {
          stateFileElement.signer = this.signer;
          stateFileElement.prompter = this.prompter;
          stateFileElement.txGenerator = this.txGenerator;
          stateFileElement.moduleStateRepo = this.moduleStateRepo;

          resolvedModuleState[moduleElementName] = stateFileElement;
        }

        i++;
        continue;
      }

      stateFileElement = stateFileElement as unknown as StatefulEvent;
      if (
        checkIfExist(stateFileElement) &&
        checkIfExist(stateFileElement.event)
      ) {
        if (!(resolvedModuleStateElement instanceof StatefulEvent)) {
          throw new UserError("Module and module state file didn't match element.");
        }

        if (stateFileElement.event.name !== resolvedModuleStateElement.event.name) {
          throw new UserError(`Module and module state file didn't match state element name:
Module file: ${resolvedModuleStateElement.event.name}
State file: ${stateFileElement.event.name}`);
        }

        if (stateFileElement.event.eventType !== resolvedModuleStateElement.event.eventType) {
          throw new UserError(`Module and module state file didn't match state element event type:
Module file: ${resolvedModuleStateElement.event.eventType}
State file: ${stateFileElement.event.eventType}`);
        }

        stateFileElement.event = resolvedModuleStateElement.event;
        resolvedModuleState[moduleElementName] = stateFileElement;

        i++;
        continue;
      }

      if (resolvedModuleStateElement instanceof ContractBinding) {
        resolvedModuleStateElement.signer = this.signer;
        resolvedModuleStateElement.prompter = this.prompter;
        resolvedModuleStateElement.txGenerator = this.txGenerator;
        resolvedModuleStateElement.moduleStateRepo = this.moduleStateRepo;

        resolvedModuleState[moduleElementName] = resolvedModuleStateElement;
      }

      if (resolvedModuleStateElement instanceof StatefulEvent) {
        resolvedModuleState[moduleElementName] = resolvedModuleStateElement;
      }

      i++;
    }

    return resolvedModuleState;
  }

  private static resolveContractsAndEvents(
    moduleState: { [p: string]: ContractBinding | StatefulEvent },
    bindings: { [p: string]: ContractBinding },
    binding: ContractBinding,
    events: Events,
    moduleEvents: ModuleEvents,
  ): { [p: string]: ContractBinding | StatefulEvent } {
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

    if (!checkIfExist(binding?.libraries)) {
      throw new UserError(`Contract is not compiled correctly - ${binding.name}`);
    }

    binding.libraries = binding.libraries as SingleContractLinkReference;
    for (const [bindingName] of Object.entries(binding.libraries)) {
      const libBinding = bindings[bindingName];
      if (!checkIfExist(libBinding)) {
        continue;
      }

      this.resolveContractsAndEvents(moduleState, bindings, libBinding, events, moduleEvents);
    }

    this.handleModuleEvents(moduleState, moduleEvents.onStart);
    this.resolveBeforeDeployEvents(moduleState, binding, bindings, events, moduleEvents);

    // this is necessary in order to surface tx data to user
    bindings[binding.name] = binding;
    moduleState[binding.name] = bindings[binding.name];

    this.resolveAfterDeployEvents(moduleState, binding, bindings, events, moduleEvents);

    return moduleState;
  }

  private static resolveBeforeDeployEvents(
    moduleState: { [p: string]: ContractBinding | StatefulEvent },
    binding: ContractBinding,
    bindings: { [p: string]: ContractBinding },
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
    moduleState: { [p: string]: ContractBinding | StatefulEvent },
    binding: ContractBinding,
    bindings: { [p: string]: ContractBinding },
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
    moduleState: ModuleState | { [p: string]: ContractBinding | StatefulEvent },
    moduleEvents: { [name: string]: ModuleEvent },
  ) {
    for (const [eventName, moduleEvent] of Object.entries(moduleEvents)) {
      // @TODO module events are always executed
      if (checkIfExist(moduleState[eventName]) && (moduleState[eventName] as StatefulEvent).executed) {
        continue;
      }

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
        cli.info(indent + '└── Contract: ' + arg.name);
        return printArgs(arg.args, indent + '  ');
      }
    }
  }

  return;
}

function printEvents(events: EventsDepRef, indent: string) {
  for (const [eventType, eventArray] of Object.entries(events)) {
    if (eventArray.length === 0) {
      continue;
    }

    cli.info(indent + '└── Event: ' + eventType);
    for (const event of eventArray) {
      cli.info(indent + '  └── ' + event);
    }
  }
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

