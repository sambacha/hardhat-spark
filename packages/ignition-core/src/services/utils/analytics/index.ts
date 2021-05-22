export * from "./analytics_service";
export * from "./analytics_util";
export * from "./empty_analytics_service";

export interface IErrorReporting {
  reportError(err: Error): void;
}
