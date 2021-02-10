import {
  AfterDeployEvent, BaseEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  ModuleEvent,
  OnChangeEvent, StatefulEvent
} from '../../../interfaces/mortar';
import { checkIfExist } from '../../utils/util';
import { CliError } from '../../types/errors';

export class Batcher {
  static async handleAfterDeployEvent(event: AfterDeployEvent, element: StatefulEvent, batches: any[], elementsBatches: any) {
    this.baseEventHandling(event, element, batches, elementsBatches);
  }

  static async handleOnChangeEvent(event: OnChangeEvent, element: StatefulEvent, batches: any[], elementsBatches: any) {
    this.baseEventHandling(event, element, batches, elementsBatches);
  }

  static async handleBeforeCompileEvent(event: BeforeCompileEvent, element: StatefulEvent, batches: any[], elementsBatches: any) {
    this.baseEventHandling(event, element, batches, elementsBatches);
  }

  static async handleCompiledEvent(event: BeforeDeployEvent, element: StatefulEvent, batches: any[], elementsBatches: any) {
    this.baseEventHandling(event, element, batches, elementsBatches);
  }

  static async handleOnModuleStart(event: ModuleEvent, element: StatefulEvent, batches: any[]) {
    this.moduleEventHandling(element, batches);
  }

  private static moduleEventHandling(element: StatefulEvent, batches: any[]) {
    if (!checkIfExist(batches[0])) {
      batches[0] = [];
    }

    batches[0].push(element);
  }

  private static baseEventHandling(event: BaseEvent, element: StatefulEvent, batches: any[], elementsBatches: any) {
    let deepestDepNumber = 0;

    for (const usage of event.usage) {
      if (!checkIfExist(elementsBatches[usage])) {
        throw new CliError(`Usage is not yet deployed - ${usage}`); // @TODO add dynamic resolving here.
      }

      if (elementsBatches[usage] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[usage];
      }
    }

    for (const dep of event.deps) {
      if (!checkIfExist(elementsBatches[dep])) {
        throw new CliError(`Dependency is not yet deployed \nEvent: ${event.name} \nDependency: ${dep}`);
      }

      if (elementsBatches[dep] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[dep];
      }
    }

    for (const eventDep of event.eventDeps) {
      if (!checkIfExist(elementsBatches[eventDep])) {
        throw new CliError(`Event Dependency is not yet deployed - ${eventDep}`);
      }

      if (elementsBatches[eventDep] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[eventDep];
      }
    }

    for (const eventUsage of event.eventUsage) {
      if (!checkIfExist(elementsBatches[eventUsage])) {
        throw new CliError(`Event usage is not yet deployed - ${eventUsage}`);
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
