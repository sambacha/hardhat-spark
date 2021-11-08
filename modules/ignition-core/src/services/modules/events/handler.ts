import {
  AfterCompileEvent,
  AfterDeployEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  ContractBinding,
  EventFn,
  EventFnCompiled,
  EventFnDeployed,
  EventType,
  ModuleEvent,
  ModuleEventFn,
  OnChangeEvent,
  StatefulEvent,
} from "../../../interfaces/hardhat-ignition";
import { CliError, EventExecutionError } from "../../types/errors";
import { ModuleState } from "../../types/module";
import { ILogging } from "../../utils/logging";
import { checkIfExist } from "../../utils/util";
import { ModuleStateRepo } from "../states/repo/state-repo";

export class EventHandler {
  private readonly _moduleState: ModuleStateRepo;
  private readonly _logger: ILogging;

  constructor(moduleState: ModuleStateRepo, logger: ILogging) {
    this._moduleState = moduleState;
    this._logger = logger;
  }

  public async executeBeforeCompileEventHook(
    moduleName: string,
    event: BeforeCompileEvent,
    moduleState: ModuleState
  ): Promise<void> {
    const eventElement = moduleState[event.name] as StatefulEvent;
    if (eventElement.executed) {
      this._logger.alreadyDeployed(event.name);
      this._logger.finishedEventExecution(event.name, event.eventType);

      return;
    }

    const deps = event.deps;
    const fn = event.fn;
    const eventName = event.name;

    for (const dependencyName of deps) {
      if (!checkIfExist(moduleState[dependencyName])) {
        throw new CliError(
          "Module state element that is part of event dependency is not contract."
        );
      }

      if (
        !checkIfExist((moduleState[dependencyName] as ContractBinding).name) ||
        !checkIfExist((moduleState[dependencyName] as ContractBinding).args)
      ) {
        throw new CliError("Desired contract is not yet been compiled.");
      }

      if (
        (moduleState[dependencyName] as ContractBinding).deployMetaData
          .lastEventName === eventName
      ) {
        (moduleState[
          dependencyName
        ] as ContractBinding).deployMetaData.logicallyDeployed = true;
      }
    }

    await this._executeEvent(eventName, fn);
    await this._moduleState.finishCurrentEvent(
      moduleName,
      moduleState,
      eventName
    );
    this._logger.finishedEventExecution(
      eventName,
      eventElement.event.eventType
    );
  }

  public async executeAfterCompileEventHook(
    moduleName: string,
    event: AfterCompileEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleCompiledBindingsEvents(
      moduleName,
      event.name,
      event.fn,
      event.deps,
      moduleState
    );
  }

  public async executeBeforeDeployEventHook(
    moduleName: string,
    event: BeforeDeployEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleCompiledBindingsEvents(
      moduleName,
      event.name,
      event.fn,
      event.deps,
      moduleState
    );
  }

  public async executeAfterDeployEventHook(
    moduleName: string,
    event: AfterDeployEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleDeployedBindingsEvents(
      moduleName,
      event.name,
      event.fn,
      event.deps,
      moduleState
    );
  }

  public async executeOnChangeEventHook(
    moduleName: string,
    event: OnChangeEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleDeployedBindingsEvents(
      moduleName,
      event.name,
      event.fn,
      event.deps,
      moduleState
    );
  }

  public async executeOnStartModuleEventHook(
    moduleName: string,
    event: ModuleEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleModuleEventHooks(
      moduleName,
      event.name,
      event.eventType,
      event.fn,
      moduleState
    );
  }

  public async executeOnCompletionModuleEventHook(
    moduleName: string,
    event: ModuleEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleModuleEventHooks(
      moduleName,
      event.name,
      event.eventType,
      event.fn,
      moduleState
    );
  }

  public async executeOnErrorModuleEventHook(
    moduleName: string,
    event: ModuleEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleModuleEventHooks(
      moduleName,
      event.name,
      event.eventType,
      event.fn,
      moduleState
    );
  }

  public async executeOnSuccessModuleEventHook(
    moduleName: string,
    event: ModuleEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleModuleEventHooks(
      moduleName,
      event.name,
      event.eventType,
      event.fn,
      moduleState
    );
  }

  public async executeOnFailModuleEventHook(
    moduleName: string,
    event: ModuleEvent,
    moduleState: ModuleState
  ): Promise<void> {
    await this._handleModuleEventHooks(
      moduleName,
      event.name,
      event.eventType,
      event.fn,
      moduleState
    );
  }

  private async _handleModuleEventHooks(
    moduleName: string,
    eventName: string,
    eventType: EventType,
    fn: ModuleEventFn,
    moduleState: ModuleState
  ) {
    const eventElement = moduleState[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this._logger.alreadyDeployed(eventName);
      this._logger.finishedEventExecution(eventName, eventType);
      return;
    }

    await this._executeEvent(eventName, fn);
    await this._moduleState.finishCurrentModuleEvent(
      moduleName,
      moduleState,
      eventType,
      eventName
    );
    this._logger.finishedEventExecution(eventName, eventType);
  }

  private async _handleDeployedBindingsEvents(
    moduleName: string,
    eventName: string,
    fn: EventFnDeployed,
    deps: string[],
    moduleState: ModuleState
  ) {
    const eventElement = moduleState[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this._logger.alreadyDeployed(eventName);
      this._logger.finishedEventExecution(
        eventName,
        eventElement.event.eventType
      );
      return;
    }

    for (const dependencyName of deps) {
      if (
        !checkIfExist(moduleState[dependencyName]) &&
        checkIfExist((moduleState[dependencyName] as ContractBinding).bytecode)
      ) {
        throw new CliError(
          "Module state element that is part of event dependency is not contract."
        );
      }

      if (
        !checkIfExist(
          (moduleState[dependencyName] as ContractBinding).bytecode
        ) ||
        !checkIfExist(
          (moduleState[dependencyName] as ContractBinding).deployMetaData
            ?.contractAddress
        )
      ) {
        throw new CliError(
          `Desired contract is not yet deployed - ${dependencyName}`
        );
      }

      if (
        (moduleState[dependencyName] as ContractBinding).deployMetaData
          ?.lastEventName === eventName
      ) {
        (moduleState[
          dependencyName
        ] as ContractBinding).deployMetaData.logicallyDeployed = true;
      }
    }

    await this._executeEvent(eventName, fn);
    await this._moduleState.finishCurrentEvent(
      moduleName,
      moduleState,
      eventName
    );
    this._logger.finishedEventExecution(
      eventName,
      eventElement.event.eventType
    );
  }

  private async _handleCompiledBindingsEvents(
    moduleName: string,
    eventName: string,
    fn: EventFnCompiled,
    deps: string[],
    moduleState: ModuleState
  ) {
    const eventElement = moduleState[eventName] as StatefulEvent;
    if (eventElement.executed) {
      this._logger.alreadyDeployed(eventName);
      this._logger.finishedEventExecution(
        eventName,
        eventElement.event.eventType
      );
      return;
    }

    for (const dependencyName of deps) {
      if (
        !checkIfExist(moduleState[dependencyName]) &&
        checkIfExist((moduleState[dependencyName] as ContractBinding)?.bytecode)
      ) {
        throw new CliError(
          "Module state element that is part of event dependency is not contract."
        );
      }

      if (
        !checkIfExist(
          (moduleState[dependencyName] as ContractBinding).bytecode
        ) ||
        !checkIfExist((moduleState[dependencyName] as ContractBinding).abi)
      ) {
        throw new CliError("Desired contract is not yet been compiled.");
      }

      if (
        (moduleState[dependencyName] as ContractBinding).deployMetaData
          .lastEventName === eventName
      ) {
        (moduleState[
          dependencyName
        ] as ContractBinding).deployMetaData.logicallyDeployed = true;
      }
    }

    await this._executeEvent(eventName, fn);
    await this._moduleState.finishCurrentEvent(
      moduleName,
      moduleState,
      eventName
    );
    this._logger.finishedEventExecution(
      eventName,
      eventElement.event.eventType
    );
  }

  private async _executeEvent(eventName: string, fn: EventFn) {
    this._moduleState.setSingleEventName(eventName);
    try {
      await fn();
    } catch (e) {
      if (e._isUserError || e._isCliError) {
        throw e;
      }

      throw new EventExecutionError(eventName, e);
    }
  }
}
