import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from '@tenderly/ignition';

export declare class ExampleModuleBuilder extends ModuleBuilder {
  Example: ContractBinding;
  SecondExample: ContractBinding;
  ThirdExample: ContractBinding;
  firstAfterDeployment: StatefulEvent;
  secondAfterDeployment: StatefulEvent;
  firstAfterCompile: StatefulEvent;
  firstBeforeCompile: StatefulEvent;
  firstBeforeDeployment: StatefulEvent;
  firstOnChange: StatefulEvent;
  getName: Action;
}
