import { IAnalyticsService } from './index';

export class EmptyAnalyticsService implements IAnalyticsService {
  constructor() {
  }

  reportError(err: Error) {
    return;
  }

  sendCommandHit(taskName: string) {
    return;
  }
}
