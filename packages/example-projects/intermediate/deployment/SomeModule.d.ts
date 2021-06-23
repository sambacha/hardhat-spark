import {
  Action,
  ContractBinding,
  ModuleBuilder,
  StatefulEvent,
} from "ignition-core";

export declare class SomeModuleBuilder extends ModuleBuilder {
  public Address: ContractBinding;
  public ERC20One: ContractBinding;
  public ERC20Two: ContractBinding;
  public Proxy: ContractBinding;
  public afterDeployMintTokens: StatefulEvent;
  public changeFromToSecondToken: StatefulEvent;
  public afterDeployAndChange: StatefulEvent;
}
