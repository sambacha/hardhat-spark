import {Events} from "../../interfaces/mortar";

export function checkIfExist(object: any): boolean {
  return object != null && typeof object != 'undefined';
}

export function checkIfFuncExist(func: any): boolean {
  return typeof func === "function"
}

export function checkIfEventsExist(events: Events): boolean {
  return events.onChange.length > 0 ||
    events.beforeCompile.length > 0 ||
    events.afterCompile.length > 0 ||
    events.beforeDeploy.length > 0 ||
    events.afterDeploy.length > 0 ||
    events.beforeDeployment.length > 0 ||
    events.afterDeployment.length > 0;
}
