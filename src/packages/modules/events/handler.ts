import {
  AfterCompileEvent,
  AfterDeployEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  ContractBinding,
  EventFnCompiled,
  EventFnDeployed, EventType,
  ModuleEvent, ModuleEventFn,
  OnChangeEvent,
  StatefulEvent
} from '../../../interfaces/hardhat_ignition';
import { checkIfExist } from '../../utils/util';
import { ModuleStateRepo } from '../states/state_repo';
import { ModuleState } from '../states/module';
import { CliError } from '../../types/errors';
import { IPrompter } from '../../utils/logging';

export class EventHandler {
  private readonly moduleState: ModuleStateRepo;
  private readonly prompter: IPrompter;

  constructor(moduleState: ModuleStateRepo, prompter: IPrompter) {
    this.moduleState = moduleState;
    this.prompter = prompter;
  }

  async executeBeforeCompileEventHook(moduleName: string, event: BeforeCompileEvent, moduleState: ModuleState): Promise<void> {
    const eventElement = moduleState[event.name] as StatefulEvent;
    if (eventElement.executed) {
      this.prompter.alreadyDeployed(event.name);
      return;
    }

    const deps = event.deps;
    const fn = event.fn;
    const eventName = event.name;

    for (const dependencyName of deps) {
      if (!checkIfExist(moduleState[dependencyName])) {
        throw new CliError('Module state element that is part of event dependency is not contract.');
      }

      if (
        !checkIfExist((moduleState[dependencyName] as ContractBinding).name) ||
        !checkIfExist((moduleState[dependencyName] as ContractBinding).args)
      ) {
        throw new CliError('Desired contract is not yet been compiled.');
      }

      if ((moduleState[dependencyName] as ContractBinding).deployMetaData.lastEventName === eventName) {
        (moduleState[dependencyName] as ContractBinding).deployMetaData.logicallyDeployed = true;
      }
    }

    await this.moduleState.setSingleEventName(eventName);
    await fn();
    await this.moduleState.finishCurrentEvent(moduleName, moduleState, eventName);
    this.prompter.finishedEventExecution(eventName);
  }

  async executeAfterCompileEventHook(moduleName: string, event: AfterCompileEvent, moduleState: ModuleState): Promise<void> {
    await this.handleCompiledBindingsEvents(moduleName, event.name, event.fn, event.deps, moduleState);
  }

  async executeBeforeDeployEventHook(moduleName: string, event: BeforeDeployEvent, moduleState: ModuleState): Promise<void> {
    await this.handleCompiledBindingsEvents(moduleName, event.name, event.fn, event.deps, moduleState);
  }

  async executeAfterDeployEventHook(moduleName: string, event: AfterDeployEvent, moduleState: ModuleState): Promise<void> {
    await this.handleDeployedBindingsEvents(moduleName, event.name, event.fn, event.deps, moduleState);
  }

  async executeOnChangeEventHook(moduleName: string, event: OnChangeEvent, moduleState: ModuleState): Promise<void> {
    await this.handleDeployedBindingsEvents(moduleName, event.name, event.fn, event.deps, moduleState);
  }

  async executeOnStartModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(moduleName, event.name, event.eventType, event.fn, moduleState);
  }

  async executeOnCompletionModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(moduleName, event.name, event.eventType, event.fn, moduleState);
  }

  async executeOnErrorModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(moduleName, event.name, event.eventType, event.fn, moduleState);
  }

  async executeOnSuccessModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(moduleName, event.name, event.eventType, event.fn, moduleState);
  }

  async executeOnFailModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(moduleName, event.name, event.eventType, event.fn, moduleState);
  }

  private async handleModuleEventHooks(
    moduleName: string,
    eventName: string,
    eventType: EventType,
    fn: ModuleEventFn,
    moduleStates: ModuleState,
  ) {
    const eventElement = moduleStates[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this.prompter.alreadyDeployed(eventName);
      return;
    }

    await this.moduleState.setSingleEventName(eventName);
    await fn();
    await this.moduleState.finishCurrentModuleEvent(moduleName, moduleStates, eventType, eventName);
    this.prompter.finishedEventExecution(eventName);
  }

  private async handleDeployedBindingsEvents(
    moduleName: string,
    eventName: string,
    fn: EventFnDeployed,
    deps: string[],
    moduleStates: ModuleState,
  ) {
    const eventElement = moduleStates[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this.prompter.alreadyDeployed(eventName);
      return;
    }

    for (const dependencyName of deps) {
      if (!checkIfExist(moduleStates[dependencyName]) && checkIfExist((moduleStates[dependencyName] as ContractBinding).bytecode)) {
        throw new CliError('Module state element that is part of event dependency is not contract.');
      }

      if (
        !checkIfExist((moduleStates[dependencyName] as ContractBinding).bytecode) ||
        !checkIfExist((moduleStates[dependencyName] as ContractBinding).deployMetaData?.contractAddress)
      ) {
        throw new CliError(`Desired contract is not yet deployed - ${dependencyName}`);
      }

      if ((moduleStates[dependencyName] as ContractBinding).deployMetaData?.lastEventName == eventName) {
        (moduleStates[dependencyName] as ContractBinding).deployMetaData.logicallyDeployed = true;
      }
    }

    await this.moduleState.setSingleEventName(eventName);
    await fn();
    await this.moduleState.finishCurrentEvent(moduleName, moduleStates, eventName);
    this.prompter.finishedEventExecution(eventName);
  }

  private async handleCompiledBindingsEvents(
    moduleName: string,
    eventName: string,
    fn: EventFnCompiled,
    deps: string[],
    moduleStates: ModuleState,
  ) {
    const eventElement = moduleStates[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this.prompter.alreadyDeployed(eventName);
      return;
    }

    for (const dependencyName of deps) {
      if (!checkIfExist(moduleStates[dependencyName]) && checkIfExist((moduleStates[dependencyName] as ContractBinding)?.bytecode)) {
        throw new CliError('Module state element that is part of event dependency is not contract.');
      }

      if (
        !checkIfExist((moduleStates[dependencyName] as ContractBinding).bytecode) ||
        !checkIfExist((moduleStates[dependencyName] as ContractBinding).abi)
      ) {
        throw new CliError('Desired contract is not yet been compiled.');
      }

      if ((moduleStates[dependencyName] as ContractBinding).deployMetaData.lastEventName === eventName) {
        (moduleStates[dependencyName] as ContractBinding).deployMetaData.logicallyDeployed = true;
      }
    }

    await this.moduleState.setSingleEventName(eventName);
    await fn();
    await this.moduleState.finishCurrentEvent(moduleName, moduleStates, eventName);
    this.prompter.finishedEventExecution(eventName);
  }
}
