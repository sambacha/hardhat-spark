import {
  AfterDeployEvent, BaseEvent,
  BeforeCompileEvent,
  BeforeDeployEvent,
  ModuleEvent,
  OnChangeEvent, StatefulEvent
} from '../../../interfaces/mortar';
import { checkIfExist } from '../../utils/util';

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
      if (elementsBatches[usage] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[usage];
      }
    }

    for (const dep of event.deps) {
      if (elementsBatches[dep] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[dep];
      }
    }

    for (const eventDep of event.eventDeps) {
      if (elementsBatches[eventDep] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[eventDep];
      }
    }

    for (const eventUsage of event.eventUsage) {
      if (elementsBatches[eventUsage] > deepestDepNumber) {
        deepestDepNumber = elementsBatches[eventUsage];
      }
    }

    deepestDepNumber++;
    if (!checkIfExist(batches[deepestDepNumber])) {
      batches[deepestDepNumber] = [];
    }

    batches[deepestDepNumber].push(element);
  }
}
