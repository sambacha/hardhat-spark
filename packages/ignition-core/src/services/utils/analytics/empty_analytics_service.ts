import { IErrorReporting } from "./index";

export class EmptyAnalyticsService implements IErrorReporting {
  constructor() {}

  public reportError(err: Error) {
    return;
  }
}
