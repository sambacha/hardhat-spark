import 'hardhat/types/config';
import 'hardhat/types/runtime';
import {
  IIgnition,
} from 'ignition-core';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    ignition: IIgnition;
  }
}
