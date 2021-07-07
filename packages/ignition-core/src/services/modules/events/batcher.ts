import {
  AfterDeployEvent,
  BaseEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  EventType,
  ModuleEvent,
  OnChangeEvent,
  StatefulEvent,
} from "../../../interfaces/hardhat-ignition";
import {
  CliError,
  EventDependencyNotDeployedError,
  EventUsageIsNotDeployed,
} from "../../types/errors";
import { checkIfExist } from "../../utils/util";

export class Batcher {
  public static async handleAfterDeployEvent(
    event: AfterDeployEvent,
    element: StatefulEvent,
    batches: any[],
    elementsBatches: any
  ) {
    this._baseEventHandling(event, element, batches, elementsBatches);
  }

  public static async handleOnChangeEvent(
    event: OnChangeEvent,
    element: StatefulEvent,
    batches: any[],
    elementsBatches: any
  ) {
    this._baseEventHandling(event, element, batches, elementsBatches);
  }

  public static async handleBeforeCompileEvent(
    event: BeforeCompileEvent,
    element: StatefulEvent,
    batches: any[],
    elementsBatches: any
  ) {
    this._baseEventHandling(event, element, batches, elementsBatches);
  }

  public static async handleCompiledEvent(
    event: BeforeDeployEvent,
    element: StatefulEvent,
    batches: any[],
    elementsBatches: any
  ) {
    this._baseEventHandling(event, element, batches, elementsBatches);
  }

  public static async handleModuleEvent(
    event: ModuleEvent,
    element: StatefulEvent,
    batches: any[]
  ) {
    this._moduleEventHandling(element, batches);
  }

  private static _moduleEventHandling(element: StatefulEvent, batches: any[]) {
    if (!checkIfExist(batches[0])) {
      batches[0] = [];
    }

    batches[0].push(element);
  }

  private static _baseEventHandling(
    event: BaseEvent,
    element: StatefulEvent,
    batches: any[],
    elementsBatches: any
  ) {
    switch (event.eventType) {
      case EventType.BEFORE_COMPILE_EVENT:
      case EventType.AFTER_COMPILE_EVENT:
      case EventType.BEFORE_DEPLOY_EVENT:
        this._handleBeforeDeployEvents(
          event,
          element,
          batches,
          elementsBatches
        );
        break;
      case EventType.ON_CHANGE_EVENT:
      case EventType.AFTER_DEPLOY_EVENT:
        this._handleAfterDeployEvents(event, element, batches, elementsBatches);
        break;
      default:
        throw new CliError("Event type not found");
    }
  }

  private static _handleBeforeDeployEvents(
    event: BaseEvent,
    element: StatefulEvent,
    batches: any[],
    elementsBatches: any
  ) {
    let shallowestDepNumber = batches.length;
    let deepestUsageNumber = 0;

    for (const usage of event.usage) {
      if (!checkIfExist(elementsBatches[usage])) {
        continue;
      }

      if (elementsBatches[usage] > deepestUsageNumber) {
        deepestUsageNumber = elementsBatches[usage];
      }
    }

    for (const dep of event.deps) {
      if (!checkIfExist(elementsBatches[dep])) {
        continue;
      }

      if (elementsBatches[dep] < shallowestDepNumber) {
        shallowestDepNumber = elementsBatches[dep];
      }
    }

    for (const eventDep of event.eventDeps) {
      if (!checkIfExist(elementsBatches[eventDep])) {
        continue;
      }

      if (elementsBatches[eventDep] < shallowestDepNumber) {
        shallowestDepNumber = elementsBatches[eventDep];
      }
    }

    for (const eventUsage of event.eventUsage) {
      if (!checkIfExist(elementsBatches[eventUsage])) {
        continue;
      }

      if (elementsBatches[eventUsage] > deepestUsageNumber) {
        deepestUsageNumber = elementsBatches[eventUsage];
      }
    }

    if (deepestUsageNumber > shallowestDepNumber) {
      throw new CliError(
        `batcher failed to resolve element usage and dependencies - ${element.event.name}`
      );
    }

    if (shallowestDepNumber > 0) {
      shallowestDepNumber--;
    }
    deepestUsageNumber++;

    const batchNumber =
      deepestUsageNumber < shallowestDepNumber
        ? deepestUsageNumber
        : shallowestDepNumber;
    if (!checkIfExist(batches[batchNumber])) {
      batches[batchNumber] = [];
    }

    batches[batchNumber].push(element);
    elementsBatches[event.name] = batchNumber;
  }

  private static _handleAfterDeployEvents(
    event: BaseEvent,
    element: StatefulEvent,
    batches: any[],
    elementsBatches: any
  ) {
    let deepestDepNumber = 0;

    for (const usage of event.usage) {
      if (!checkIfExist(elementsBatches[usage])) {
        throw new EventUsageIsNotDeployed(event.name, usage);
      }

      if (elementsBatches[usage] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[usage];
      }
    }

    for (const dep of event.deps) {
      if (!checkIfExist(elementsBatches[dep])) {
        throw new EventDependencyNotDeployedError(event.name, dep);
      }

      if (elementsBatches[dep] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[dep];
      }
    }

    for (const eventDep of event.eventDeps) {
      if (!checkIfExist(elementsBatches[eventDep])) {
        throw new EventDependencyNotDeployedError(event.name, eventDep);
      }

      if (elementsBatches[eventDep] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[eventDep];
      }
    }

    for (const eventUsage of event.eventUsage) {
      if (!checkIfExist(elementsBatches[eventUsage])) {
        throw new EventUsageIsNotDeployed(event.name, eventUsage);
      }

      if (elementsBatches[eventUsage] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[eventUsage];
      }
    }

    deepestDepNumber++;
    if (!checkIfExist(batches[deepestDepNumber])) {
      batches[deepestDepNumber] = [];
    }

    batches[deepestDepNumber].push(element);
    elementsBatches[event.name] = deepestDepNumber;
  }
}
