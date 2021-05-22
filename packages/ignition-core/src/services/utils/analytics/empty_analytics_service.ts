import { IErrorReporting } from "./index";

export class EmptyAnalyticsService implements IErrorReporting {
  constructor() {}

  reportError(err: Error) {
    return;
  }

  sendCommandHit(taskName: string) {
    return;
  }
}
