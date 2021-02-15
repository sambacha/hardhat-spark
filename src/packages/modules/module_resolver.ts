import {
  Events,
  StatefulEvent,
  ContractBinding, ModuleEvents, ModuleEvent, ContractEvent, ContractBindingMetaData,
} from '../../interfaces/mortar';
import { checkIfExist } from '../utils/util';
import { cli } from 'cli-ux';
import { ethers } from 'ethers';
import { IPrompter } from '../utils/promter';
import { EthTxGenerator } from '../ethereum/transactions/generator';
import { UsageEventNotFound, UserError } from '../types/errors';
import { ModuleState, ModuleStateFile } from './states/module';
import { ModuleStateRepo } from './states/state_repo';
import { SingleContractLinkReference } from '../types/artifacts/libraries';
import { EventTxExecutor } from '../ethereum/transactions/event_executor';
import { Namespace } from 'cls-hooked';

export class ModuleResolver {
  private readonly signer: ethers.Wallet;
  private readonly prompter: IPrompter;
  private readonly txGenerator: EthTxGenerator;
  private readonly moduleStateRepo: ModuleStateRepo;
  private readonly eventTxExecutor: EventTxExecutor;
  private readonly eventSession: Namespace;

  constructor(provider: ethers.providers.JsonRpcProvider, privateKey: string, prompter: IPrompter, txGenerator: EthTxGenerator, moduleStateRepo: ModuleStateRepo, eventTxExecutor: EventTxExecutor, eventSession: Namespace) {
    this.signer = new ethers.Wallet(privateKey, provider);
    this.prompter = prompter;
    this.txGenerator = txGenerator;
    this.moduleStateRepo = moduleStateRepo;
    this.eventTxExecutor = eventTxExecutor;
    this.eventSession = eventSession;
  }

  checkIfDiff(oldModuleState: ModuleStateFile, newModuleStates: ModuleState): boolean {
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
      let oldModuleElement: ContractBindingMetaData | StatefulEvent = oldModuleState[Object.keys(oldModuleState)[i]];
      let newModuleElement: ContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(oldModuleElement?.bytecode) && checkIfExist(newModuleElement?.bytecode)) {
        oldModuleElement = (oldModuleElement as ContractBindingMetaData);
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

  printDiffParams(oldModuleStates: ModuleStateFile, newModuleStates: ModuleState): void {
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

    let i = 0;
    while (i < oldModuleStatesLength) {
      let oldModuleElement: ContractBindingMetaData | StatefulEvent = oldModuleStates[Object.keys(oldModuleStates)[i]];
      let newModuleElement: ContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(oldModuleElement?.bytecode) && checkIfExist(newModuleElement?.bytecode)) {
        oldModuleElement = oldModuleElement as ContractBindingMetaData;
        newModuleElement = newModuleElement as ContractBinding;

        if (oldModuleElement.bytecode != newModuleElement.bytecode) {
          cli.info('~', 'Contract: ', newModuleElement.name);
          printArgs(newModuleElement.args, '  ');
        }

        i++;
        continue;
      }

      oldModuleElement = oldModuleElement as StatefulEvent;
      newModuleElement = newModuleElement as StatefulEvent;
      if (checkIfExist(oldModuleElement?.event) && checkIfExist(newModuleElement?.event)) {
        const newEvent = newModuleElement.event as ContractEvent;
        const oldEvent = oldModuleElement.event as ContractEvent;

        if (
          newEvent.eventType != oldEvent.eventType ||
          newEvent.name != oldEvent.name ||
          !oldModuleElement.executed
        ) {
          cli.info('~', 'Event', newModuleElement.event.name);
          printArgs(newEvent.deps, '  ');
          printEvents(newEvent.eventDeps, '  ');
        }
      }

      i++;
    }

    while (i < newModuleStatesLength) {
      let newModuleElement: ContractBinding | StatefulEvent = newModuleStates[Object.keys(newModuleStates)[i]];

      // @ts-ignore
      if (checkIfExist(newModuleElement?.bytecode)) {
        newModuleElement = newModuleElement as ContractBinding;

        cli.info('+', 'Contract', newModuleElement.name);
        printArgs(newModuleElement.args, '  ');

        i++;
        continue;
      }

      newModuleElement = newModuleElement as StatefulEvent;
      if (checkIfExist(newModuleElement?.event)) {
        cli.info('+', 'Event', newModuleElement.event.name);
        const newEvent = newModuleElement.event as ContractEvent;

        printArgs(newEvent.deps, '  ');
        printEvents(newEvent.eventDeps, '  ');
      }

      i++;
    }

    return;
  }

  resolve(
    currentBindings: { [p: string]: ContractBinding },
    currentEvents: Events,
    moduleEvents: ModuleEvents,
    moduleStateFile: ModuleStateFile,
  ): ModuleState {
    let resolvedModuleElements: { [p: string]: ContractBinding | StatefulEvent } = {};

    for (const [bindingName, binding] of Object.entries(currentBindings)) {
      if (checkIfExist(resolvedModuleElements[bindingName])) {
        continue;
      }

      resolvedModuleElements = ModuleResolver.resolveContractsAndEvents(resolvedModuleElements, currentBindings, binding, currentEvents, moduleEvents);
    }
    ModuleResolver.handleModuleEvents(resolvedModuleElements, moduleEvents.onSuccess);
    ModuleResolver.handleModuleEvents(resolvedModuleElements, moduleEvents.onCompletion);

    let moduleStateLength = 0;
    if (checkIfExist(resolvedModuleElements)) {
      moduleStateLength = Object.keys(resolvedModuleElements).length;
    }

    const resolvedModuleState: ModuleState = {};
    let i = 0;
    const moduleElementNames = Object.keys(resolvedModuleElements);
    while (i < moduleStateLength) {
      const moduleElementName = moduleElementNames[i];
      let resolvedModuleStateElement = resolvedModuleElements[moduleElementName];

      let stateFileElement = moduleStateFile[moduleElementName];
      stateFileElement = stateFileElement as ContractBindingMetaData;
      if (checkIfExist(stateFileElement) && checkIfExist(stateFileElement?.bytecode)) {
        if (!((resolvedModuleStateElement as ContractBinding)._isContractBinding)) {
          throw new UserError(`Module and module state file didn't match state element name:
Module file: ${(resolvedModuleStateElement as StatefulEvent).event.name}`);
        }

        resolvedModuleStateElement = resolvedModuleStateElement as ContractBinding;
        if (
          resolvedModuleStateElement.forceFlag == true ||
          (
            stateFileElement.bytecode != resolvedModuleStateElement.bytecode &&
            !(!!resolvedModuleStateElement.deployMetaData.shouldRedeploy &&
              resolvedModuleStateElement.deployMetaData.shouldRedeploy(resolvedModuleStateElement))
          )
          || !checkIfExist(stateFileElement.deployMetaData?.contractAddress)
        ) {
          resolvedModuleStateElement.signer = this.signer;
          resolvedModuleStateElement.prompter = this.prompter;
          resolvedModuleStateElement.txGenerator = this.txGenerator;
          resolvedModuleStateElement.moduleStateRepo = this.moduleStateRepo;
          resolvedModuleStateElement.eventTxExecutor = this.eventTxExecutor;
          resolvedModuleStateElement.eventSession = this.eventSession;

          resolvedModuleState[moduleElementName] = resolvedModuleStateElement;

          // this is necessary in order to surface contract metadata to consumer;
          currentBindings[moduleElementName] = resolvedModuleStateElement;

          i++;
          continue;
        }

        resolvedModuleStateElement.bytecode = stateFileElement.bytecode;
        resolvedModuleStateElement.abi = stateFileElement.abi;
        resolvedModuleStateElement.libraries = stateFileElement.libraries;
        resolvedModuleStateElement.deployMetaData = stateFileElement.deployMetaData;
        resolvedModuleStateElement.txData = stateFileElement.txData;
        resolvedModuleStateElement.signer = this.signer;
        resolvedModuleStateElement.prompter = this.prompter;
        resolvedModuleStateElement.txGenerator = this.txGenerator;
        resolvedModuleStateElement.moduleStateRepo = this.moduleStateRepo;
        resolvedModuleStateElement.eventTxExecutor = this.eventTxExecutor;
        resolvedModuleStateElement.eventSession = this.eventSession;

        resolvedModuleState[moduleElementName] = resolvedModuleStateElement;

        // this is necessary in order to surface contract metadata to consumer;
        currentBindings[moduleElementName] = resolvedModuleState[moduleElementName] as ContractBinding;

        i++;
        continue;
      }

      stateFileElement = stateFileElement as unknown as StatefulEvent;
      if (
        checkIfExist(stateFileElement) &&
        checkIfExist(stateFileElement.event)
      ) {
        resolvedModuleStateElement = resolvedModuleStateElement as StatefulEvent;
        if (!(resolvedModuleStateElement._isStatefulEvent)) {
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

      if ((resolvedModuleStateElement as ContractBinding)._isContractBinding) {
        resolvedModuleStateElement = resolvedModuleStateElement as ContractBinding;

        resolvedModuleStateElement.signer = this.signer;
        resolvedModuleStateElement.prompter = this.prompter;
        resolvedModuleStateElement.txGenerator = this.txGenerator;
        resolvedModuleStateElement.moduleStateRepo = this.moduleStateRepo;
        resolvedModuleStateElement.eventTxExecutor = this.eventTxExecutor;
        resolvedModuleStateElement.eventSession = this.eventSession;

        resolvedModuleState[moduleElementName] = resolvedModuleStateElement;
      }

      if ((resolvedModuleStateElement as StatefulEvent)._isStatefulEvent) {
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

    for (const deployDeps of binding.deployMetaData.deploymentSpec.deps) {
      const deployDepsBinding = bindings[deployDeps.name];
      if (!checkIfExist(deployDepsBinding)) {
        continue;
      }

      this.resolveContractsAndEvents(moduleState, bindings, deployDepsBinding, events, moduleEvents);
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

      for (const eventDepName of (events[eventName].event as ContractEvent).eventDeps) {
        const event = (events[eventDepName] as StatefulEvent).event as ContractEvent;
        if (!checkIfExist(event.eventDeps)) {
          continue;
        }

        const eventDeps = event.eventDeps;
        for (const bindingName of eventDeps) {
          if (checkIfExist(moduleState[bindingName])) {
            continue;
          }

          this.resolveContractsAndEvents(moduleState, bindings, bindings[bindingName], events, moduleEvents);
          bindings[bindingName].deployMetaData.lastEventName = eventName;
          bindings[bindingName].deployMetaData.logicallyDeployed = false;
        }
      }

      for (const eventDepName of (events[eventName].event as ContractEvent).eventUsage) {
        const event = (events[eventDepName] as StatefulEvent).event as ContractEvent;
        if (!checkIfExist(event.eventDeps)) {
          continue;
        }

        const eventDeps = event.eventDeps;
        for (const bindingName of eventDeps) {
          if (!checkIfExist(moduleState[bindingName])) {
            throw new UsageEventNotFound('Event that you are trying to use is not present in module.');
          }
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

      for (const depName of (events[eventName].event as ContractEvent).deps) {
        if (!checkIfExist(moduleState[depName])) {
          return;
        }
      }

      for (const eventDepName of (events[eventName].event as ContractEvent).eventDeps) {
        const contractEvent = (events[eventDepName] as StatefulEvent).event as ContractEvent;

        for (const depBindingName of contractEvent.deps) {
          if (checkIfExist(moduleState[depBindingName])) {
            continue; // @TODO parallelization
          }

          this.resolveContractsAndEvents(moduleState, bindings, bindings[depBindingName], events, moduleEvents);
          bindings[binding.name].deployMetaData.lastEventName = eventName;
          bindings[binding.name].deployMetaData.logicallyDeployed = false;
        }
      }

      for (const usageBindingName of (events[eventName].event as ContractEvent).usage) {
        if (checkIfExist(moduleState[usageBindingName])) {
          continue; // @TODO parallelization
        }

        this.resolveContractsAndEvents(moduleState, bindings, bindings[usageBindingName], events, moduleEvents);
      }

      for (const eventDepName of (events[eventName].event as ContractEvent).eventUsage) {
        const eventUsage = (events[eventDepName] as StatefulEvent).event as ContractEvent;

        for (const bindingUsageName of eventUsage.deps) {
          const eventUsageBinding = bindings[bindingUsageName] as ContractBinding;

          if (!checkIfExist(moduleState[eventUsageBinding.name])) {
            throw new UsageEventNotFound(`Event that you want to use is not present in your module, please check dependencies. ${events[eventName].event.name} - ${eventDepName} - ${eventUsageBinding.name}`);
          }
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
    moduleState: ModuleState | { [p: string]: ContractBindingMetaData | StatefulEvent },
    moduleEvents: { [name: string]: ModuleEvent },
  ) {
    for (const [eventName, moduleEvent] of Object.entries(moduleEvents)) {
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
  if (!checkIfExist(args)) {
    return;
  }

  if (args.length != 0) {
    for (const arg of args) {
      // @TODO: use cli-ux tree instead
      if (checkIfExist(arg.name)) {
        cli.info(indent + '└── Contract: ' + arg.name);
        return printArgs(arg.args, indent + '  ');
      }
    }
  }

  return;
}

function printEvents(events: string[], indent: string) {
  if (!checkIfExist(events)) {
    return;
  }

  for (const eventName of events) {
    cli.info(indent + '└── Event: - ' + eventName);
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

