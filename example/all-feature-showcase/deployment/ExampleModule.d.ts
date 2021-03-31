import {
  ModuleBuilder,
  ContractBinding,
  StatefulEvent,
  Action,
} from '../../../src';

export declare class ExampleModuleBuilder extends ModuleBuilder {
  Example: ContractBinding;
  SecondExample: ContractBinding;
  ThirdExample: ContractBinding;
  firstAfterDeploy: StatefulEvent;
  secondAfterDeploy: StatefulEvent;
  firstAfterCompile: StatefulEvent;
  firstBeforeCompile: StatefulEvent;
  firstBeforeDeploy: StatefulEvent;
  firstOnChange: StatefulEvent;
  getName: Action;
}
