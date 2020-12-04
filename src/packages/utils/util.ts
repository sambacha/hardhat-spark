import {ContractInput, Events} from "../../interfaces/mortar";

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

export function checkIfSameInputs(input: ContractInput, fragmentName: string, args: any[]): boolean {
  return input.functionName === fragmentName && arrayEquals(input.inputs, args)
}

function arrayEquals(a: any[], b: any[]) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index]);
}
