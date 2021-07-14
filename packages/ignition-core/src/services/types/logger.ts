import {
  ContractBinding,
  StatefulEvent,
} from "../../interfaces/hardhat-ignition";

export enum ElementStatus {
  "EMPTY" = "EMPTY",
  "IN_PROGRESS" = "IN_PROGRESS",
  "SUCCESSFULLY" = "SUCCESSFULLY",
}

export interface ElementWithStatus {
  element: ContractBinding | StatefulEvent;
  status: ElementStatus;
}
