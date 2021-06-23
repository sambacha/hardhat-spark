import {
  Action,
  ContractBinding,
  ModuleBuilder,
  StatefulEvent,
} from "ignition-core";

export declare class FirstModuleBuilder extends ModuleBuilder {
  public A: ContractBinding;
  public B: ContractBinding;
  public afterDeployBandC: StatefulEvent;
}
