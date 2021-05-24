import { BindingsConflict } from "../../types/errors";
import { ModuleStateFile } from "../../types/module";
import { checkIfExist } from "../../utils/util";

export class StateResolver {
  public static mergeStates(
    mainModuleState: ModuleStateFile,
    newModuleState: ModuleStateFile
  ): ModuleStateFile {
    for (const [stateElementName, stateElement] of Object.entries(
      newModuleState
    )) {
      if (checkIfExist(mainModuleState[stateElementName])) {
        throw new BindingsConflict(
          `Conflict in bindings when merging multiple state files. \n    Check your state files for same binding name. Use --help for more detailed description.`
        );
      }

      mainModuleState[stateElementName] = stateElement;
    }

    return mainModuleState;
  }
}
