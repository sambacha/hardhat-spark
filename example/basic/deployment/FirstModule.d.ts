import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from '@tenderly/hardhat-ignition';

export declare class FirstModuleBuilder extends ModuleBuilder {
  A: ContractBinding;
  B: ContractBinding;
  afterDeployBandC: StatefulEvent;
}
