import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from 'ignition-core';

export declare class FirstModuleBuilder extends ModuleBuilder {
  A: ContractBinding;
  B: ContractBinding;
  afterDeployBandC: StatefulEvent;
}
