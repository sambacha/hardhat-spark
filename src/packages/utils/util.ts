export function checkIfExist(object: any): boolean {
  return object != null && typeof object != 'undefined';
}

export function checkIfFuncExist(func: any): boolean {
  return typeof func === "function"
}
