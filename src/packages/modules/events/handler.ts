import {
  AfterCompileEvent,
  AfterDeployEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  ContractBinding, EventFn,
  EventFnCompiled,
  EventFnDeployed, EventType,
  ModuleEvent, ModuleEventFn,
  OnChangeEvent,
  StatefulEvent
} from '../../../interfaces/hardhat_ignition';
import { checkIfExist } from '../../utils/util';
import { ModuleStateRepo } from '../states/state_repo';
import { ModuleState } from '../states/module';
import { CliError, EventExecutionError } from '../../types/errors';
import { ILogging } from '../../utils/logging';

export class EventHandler {
  private readonly moduleState: ModuleStateRepo;
  private readonly prompter: ILogging;

  constructor(moduleState: ModuleStateRepo, prompter: ILogging) {
    this.moduleState = moduleState;
    this.prompter = prompter;
  }

  async executeBeforeCompileEventHook(moduleName: string, event: BeforeCompileEvent, moduleState: ModuleState): Promise<void> {
    const eventElement = moduleState[event.name] as StatefulEvent;
    if (eventElement.executed) {
      this.prompter.alreadyDeployed(event.name);
      this.prompter.finishedEventExecution(event.name, event.eventType);

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

    await this.executeEvent(eventName, fn);
    await this.moduleState.finishCurrentEvent(moduleName, moduleState, eventName);
    this.prompter.finishedEventExecution(eventName, eventElement.event.eventType);
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
    moduleState: ModuleState,
  ) {
    const eventElement = moduleState[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this.prompter.alreadyDeployed(eventName);
      this.prompter.finishedEventExecution(eventName, eventType);
      return;
    }

    await this.executeEvent(eventName, fn);
    await this.moduleState.finishCurrentModuleEvent(moduleName, moduleState, eventType, eventName);
    this.prompter.finishedEventExecution(eventName, eventType);
  }

  private async handleDeployedBindingsEvents(
    moduleName: string,
    eventName: string,
    fn: EventFnDeployed,
    deps: string[],
    moduleState: ModuleState,
  ) {
    const eventElement = moduleState[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this.prompter.alreadyDeployed(eventName);
      this.prompter.finishedEventExecution(eventName, eventElement.event.eventType);
      return;
    }

    for (const dependencyName of deps) {
      if (!checkIfExist(moduleState[dependencyName]) && checkIfExist((moduleState[dependencyName] as ContractBinding).bytecode)) {
        throw new CliError('Module state element that is part of event dependency is not contract.');
      }

      if (
        !checkIfExist((moduleState[dependencyName] as ContractBinding).bytecode) ||
        !checkIfExist((moduleState[dependencyName] as ContractBinding).deployMetaData?.contractAddress)
      ) {
        throw new CliError(`Desired contract is not yet deployed - ${dependencyName}`);
      }

      if ((moduleState[dependencyName] as ContractBinding).deployMetaData?.lastEventName == eventName) {
        (moduleState[dependencyName] as ContractBinding).deployMetaData.logicallyDeployed = true;
      }
    }

    await this.executeEvent(eventName, fn);
    await this.moduleState.finishCurrentEvent(moduleName, moduleState, eventName);
    this.prompter.finishedEventExecution(eventName, eventElement.event.eventType);
  }

  private async handleCompiledBindingsEvents(
    moduleName: string,
    eventName: string,
    fn: EventFnCompiled,
    deps: string[],
    moduleState: ModuleState,
  ) {
    const eventElement = moduleState[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this.prompter.alreadyDeployed(eventName);
      this.prompter.finishedEventExecution(eventName, eventElement.event.eventType);
      return;
    }

    for (const dependencyName of deps) {
      if (!checkIfExist(moduleState[dependencyName]) && checkIfExist((moduleState[dependencyName] as ContractBinding)?.bytecode)) {
        throw new CliError('Module state element that is part of event dependency is not contract.');
      }

      if (
        !checkIfExist((moduleState[dependencyName] as ContractBinding).bytecode) ||
        !checkIfExist((moduleState[dependencyName] as ContractBinding).abi)
      ) {
        throw new CliError('Desired contract is not yet been compiled.');
      }

      if ((moduleState[dependencyName] as ContractBinding).deployMetaData.lastEventName === eventName) {
        (moduleState[dependencyName] as ContractBinding).deployMetaData.logicallyDeployed = true;
      }
    }

    await this.executeEvent(eventName, fn);
    await this.moduleState.finishCurrentEvent(moduleName, moduleState, eventName);
    this.prompter.finishedEventExecution(eventName, eventElement.event.eventType);
  }

  private async executeEvent(eventName: string, fn: EventFn) {
    await this.moduleState.setSingleEventName(eventName);
    try {
      await fn();
    } catch (e) {
      if (e._isUserError || e._isCliError) {
        throw e;
      }

      throw new EventExecutionError(e);
    }
  }
}
