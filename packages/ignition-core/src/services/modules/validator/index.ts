import { JsonFragment } from "../../types/artifacts/abi";
import { ModuleBindings } from "../../types/module";

export interface IModuleValidator {
  validate(
    bindings: ModuleBindings,
    ABIs: { [name: string]: JsonFragment[] }
  ): void;
}
