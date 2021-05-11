export interface IAnalyticsService {
  reportError(err: Error): void;
  sendCommandHit(taskName: string): void;
}
