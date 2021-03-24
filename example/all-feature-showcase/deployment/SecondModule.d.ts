import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from '@tenderly/hardhat-ignition';

export declare class SecondModuleBuilder extends ModuleBuilder {
  Example: ContractBinding;
  SecondExample: ContractBinding;
  ThirdExample: ContractBinding;
}