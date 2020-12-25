import {
  AfterCompileEvent,
  AfterDeployEvent,
  AfterDeploymentEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  BeforeDeploymentEvent,
  CompiledContractBinding,
  ContractBinding, ContractEvent,
  DeployedContractBinding,
  EventFnCompiled,
  EventFnDeployed,
  Events,
  ModuleBuilder,
  ModuleEvent, ModuleEventFn,
  OnChangeEvent,
  StatefulEvent
} from '../../../interfaces/mortar';
import { checkIfExist } from '../../utils/util';
import { ModuleStateRepo } from '../states/state_repo';
import { ModuleState } from '../states/module';
import { CliError } from '../../types/errors';
import cli from 'cli-ux';

export class EventHandler {
  private readonly moduleState: ModuleStateRepo;

  constructor(moduleState: ModuleStateRepo) {
    this.moduleState = moduleState;
  }

  async executeBeforeCompileEventHook(moduleName: string, event: BeforeCompileEvent, moduleState: ModuleState): Promise<void> {
    const eventElement = moduleState[event.name] as StatefulEvent;
    if (eventElement.executed) {
      cli.info(`Event is already executed - ${event.name}`);
      return;
    }

    const deps = event.deps;
    const fn = event.fn;
    const eventName = event.name;

    const binds: ContractBinding[] = [];
    for (const dependency of deps) {
      const name = dependency.name;
      if (!checkIfExist(moduleState[name]) && checkIfExist((moduleState[name] as CompiledContractBinding).bytecode)) {
        throw new CliError('Module state element that is part of event dependency is not contract.');
      }

      binds.push(moduleState[name] as DeployedContractBinding);
    }

    await this.moduleState.setSingleEventName(eventName);
    // @TODO enable user to change module state variable
    await fn(...binds);
    await this.moduleState.finishCurrentEvent();
  }

  async executeAfterCompileEventHook(moduleName: string, event: AfterCompileEvent, moduleState: ModuleState): Promise<void> {
    await this.handleCompiledBindingsEvents(event.name, event.fn, event.deps, moduleState);
  }

  async executeBeforeDeploymentEventHook(moduleName: string, event: BeforeDeploymentEvent, moduleState: ModuleState): Promise<void> {
    await this.handleCompiledBindingsEvents(event.name, event.fn, event.deps, moduleState);
  }

  async executeAfterDeploymentEventHook(moduleName: string, event: AfterDeploymentEvent, moduleState: ModuleState): Promise<void> {
    await this.handleDeployedBindingsEvents(event.name, event.fn, event.deps, moduleState);
  }

  async executeBeforeDeployEventHook(moduleName: string, event: BeforeDeployEvent, moduleState: ModuleState): Promise<void> {
    await this.handleCompiledBindingsEvents(event.name, event.fn, event.deps, moduleState);
  }

  async executeAfterDeployEventHook(moduleName: string, event: AfterDeployEvent, moduleState: ModuleState): Promise<void> {
    await this.handleDeployedBindingsEvents(event.name, event.fn, event.deps, moduleState);
  }

  async executeOnChangeEventHook(moduleName: string, event: OnChangeEvent, moduleState: ModuleState): Promise<void> {
    await this.handleDeployedBindingsEvents(event.name, event.fn, event.deps, moduleState);
  }

  async executeOnStartModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(event.name, event.fn, moduleState);
  }

  async executeOnCompletionModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(event.name, event.fn, moduleState);
  }
  async executeOnErrorModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(event.name, event.fn, moduleState);
  }

  async executeOnSuccessModuleEventHook(moduleName: string, event: ModuleEvent, moduleState: ModuleState): Promise<void> {
    await this.handleModuleEventHooks(event.name, event.fn, moduleState);
  }

  private async handleModuleEventHooks(
    eventName: string,
    fn: ModuleEventFn,
    moduleStates: ModuleState,
  ) {
    const eventElement = moduleStates[eventName] as StatefulEvent;
    if (eventElement.executed) {
      cli.info(`Event is already executed - ${eventName}`);
      return;
    }

    await this.moduleState.setSingleEventName(eventName);
    await fn();
    await this.moduleState.finishCurrentEvent();
  }

  private async handleDeployedBindingsEvents(
    eventName: string,
    fn: EventFnDeployed,
    deps: (ContractBinding | ContractEvent)[],
    moduleStates: ModuleState,
  ) {
    const eventElement = moduleStates[eventName] as StatefulEvent;
    if (eventElement.executed) {
      cli.info(`Event is already executed - ${eventName}`);
      return;
    }

    const binds: DeployedContractBinding[] = [];
    for (const dependency of deps) {
      const name = dependency.name;

      if (!checkIfExist(moduleStates[name]) && checkIfExist((moduleStates[name] as CompiledContractBinding).bytecode)) {
        throw new CliError('Module state element that is part of event dependency is not contract.');
      }

      binds.push(moduleStates[name] as DeployedContractBinding);
    }

    await this.moduleState.setSingleEventName(eventName);
    await fn(...binds);
    await this.moduleState.finishCurrentEvent();
  }

  private async handleCompiledBindingsEvents(
    eventName: string,
    fn: EventFnCompiled,
    deps: ContractBinding[],
    moduleStates: ModuleState,
  ) {
    const eventElement = moduleStates[eventName] as StatefulEvent;
    if (eventElement.executed) {
      cli.info(`Event is already executed - ${eventName}`);
      return;
    }

    const binds: CompiledContractBinding[] = [];
    for (const dependency of deps) {
      const name = dependency.name;
      if (!checkIfExist(moduleStates[name]) && checkIfExist((moduleStates[name] as CompiledContractBinding).bytecode)) {
        throw new CliError('Module state element that is part of event dependency is not contract.');
      }

      binds.push(moduleStates[name] as CompiledContractBinding);
    }

    await this.moduleState.setSingleEventName(eventName);
    await fn(...binds);
    await this.moduleState.finishCurrentEvent();
  }
}
