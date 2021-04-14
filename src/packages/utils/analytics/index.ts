export interface IAnalyticsService {
  reportError(err: Error);
  sendCommandHit(taskName: string);
}
