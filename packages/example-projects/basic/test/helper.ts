import { IgnitionCore, ModuleStateFile } from "ignition-core";

export async function getStateObject(
  ignitionCore: IgnitionCore,
  moduleName: string
): Promise<ModuleStateFile> {
  if (ignitionCore?.moduleStateRepo !== undefined) {
    return ignitionCore.moduleStateRepo.getStateIfExist(moduleName);
  }

  return {};
}
