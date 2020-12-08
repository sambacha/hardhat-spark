import {ModuleState} from "./registry";
import {checkIfExist} from "../../utils/util";
import {BindingsConflict} from "../../types/errors";

export class StateResolver {
  static mergeStates(mainModuleState: ModuleState, newModuleState: ModuleState): ModuleState {
    for (let [bindingName, binding] of Object.entries(newModuleState)) {
      if (checkIfExist(mainModuleState[bindingName])) {
        throw new BindingsConflict(`Conflict in bindings when merging multiple state files. \n    Check your state files for same binding name. Use --help for more detailed description.`)
      }

      mainModuleState[bindingName] = binding
    }

    return mainModuleState
  }
}
