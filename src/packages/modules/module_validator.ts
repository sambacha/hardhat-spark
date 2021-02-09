import { ContractBinding } from '../../interfaces/mortar';
import { JsonFragment } from '../types/artifacts/abi';
import { handleTypes } from '../types/checker';
import { AbiMismatch } from '../types/errors';

const CONSTRUCTOR_TYPE = 'constructor';

export class ModuleValidator {
  constructor() {
  }

  validate(bindings: { [name: string]: ContractBinding }, ABIs: { [name: string]: JsonFragment[] }): void {
    for (const [name, binding] of Object.entries(bindings)) {
      const abis = ABIs[binding.contractName];
      let ABI = {} as JsonFragment;
      for (const abi of abis) {
        if (abi.type == CONSTRUCTOR_TYPE) {
          ABI = abi;
        }
      }

      const abiInputs = ABI.inputs || [];
      const abiInputsLength = ABI.inputs?.length || 0;
      if (binding.args.length != abiInputsLength && !binding.deployMetaData.deploymentSpec.deployFn) {
        throw new AbiMismatch(`Binding did not match number of arguments for contract - ${name}
  Expected ${String(ABI.inputs?.length || 0)} and got ${String(binding.args.length)} number of arguments.`);
      }

      for (let i = 0; i < binding.args.length; i++) {
        const type = abiInputs[i].type;
        const internalType = abiInputs[i].internalType;

        handleTypes(binding.name, binding.args[i], type, internalType);
      }
    }
  }
}
