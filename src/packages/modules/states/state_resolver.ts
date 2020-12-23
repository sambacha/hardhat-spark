import {ModuleState} from "./module";
import {checkIfExist} from "../../utils/util";
import {BindingsConflict} from "../../types/errors";
import {StatefulEvent} from "../../../interfaces/mortar";

export class StateResolver {
  static mergeStates(mainModuleState: ModuleState, newModuleState: ModuleState): ModuleState {
    for (let [stateElementName, stateElement] of Object.entries(newModuleState)) {
      if (checkIfExist(mainModuleState[stateElementName])) {
        throw new BindingsConflict(`Conflict in bindings when merging multiple state files. \n    Check your state files for same binding name. Use --help for more detailed description.`)
      }

      mainModuleState[stateElementName] = stateElement
    }

    return mainModuleState
  }
}
