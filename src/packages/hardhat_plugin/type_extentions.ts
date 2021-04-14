import 'hardhat/types/config';
import 'hardhat/types/runtime';
import {
  IIgnition,
} from '../../usage_interfaces';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    ignition: IIgnition;
  }
}
