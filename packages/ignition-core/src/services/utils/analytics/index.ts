export * from './analytics_service';
export * from './analytics_util';
export * from './empty_analytics_service';

export interface IAnalyticsService {
  reportError(err: Error): void;
  sendCommandHit(taskName: string): void;
}
