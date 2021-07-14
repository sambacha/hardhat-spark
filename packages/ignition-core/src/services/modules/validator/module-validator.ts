import { ContractBinding } from "../../../interfaces/hardhat-ignition";
import { JsonFragment } from "../../types/artifacts/abi";
import { handleTypes } from "../../types/checker";
import { AbiMismatch, MissingContractMetadata } from "../../types/errors";
import { checkIfExist } from "../../utils/util";

import { IModuleValidator } from "./index";

const CONSTRUCTOR_TYPE = "constructor";

export class ModuleValidator implements IModuleValidator {
  constructor() {}

  public validate(
    bindings: { [name: string]: ContractBinding },
    ABIs: { [name: string]: JsonFragment[] }
  ): void {
    for (const [name, binding] of Object.entries(bindings)) {
      if (!checkIfExist(ABIs[binding.contractName])) {
        throw new MissingContractMetadata(name);
      }

      const abis = ABIs[binding.contractName];
      let ABI: JsonFragment = {};
      for (const abi of abis) {
        if (abi.type === CONSTRUCTOR_TYPE) {
          ABI = abi;
        }
      }

      const abiInputs = ABI.inputs ?? [];
      const abiInputsLength = ABI.inputs?.length ?? 0;
      if (
        binding.args.length !== abiInputsLength &&
        binding?.deployMetaData?.deploymentSpec?.deployFn === undefined
      ) {
        throw new AbiMismatch(
          name,
          String(ABI.inputs?.length ?? 0),
          String(binding.args.length)
        );
      }

      for (let i = 0; i < binding.args.length; i++) {
        const type = abiInputs[i].type;
        const internalType = abiInputs[i].internalType;

        handleTypes(binding.name, binding.args[i], type, internalType);
      }
    }
  }
}
