import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from 'ignition-core';

export declare class SomeModuleBuilder extends ModuleBuilder {
  Address: ContractBinding;
  ERC20One: ContractBinding;
  ERC20Two: ContractBinding;
  Proxy: ContractBinding;
  afterDeployMintTokens: StatefulEvent;
  changeFromToSecondToken: StatefulEvent;
  afterDeployAndChange: StatefulEvent;
}
