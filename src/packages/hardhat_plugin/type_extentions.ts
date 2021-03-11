import 'hardhat/types/config';
import 'hardhat/types/runtime';

import { HardhatIgnitionConfig } from '../../usage_interfaces/hardhat_plugin';
import {
  IIgnition,
} from '../../usage_interfaces';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    ignition: IIgnition;
  }
}

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    ignition?: HardhatIgnitionConfig;

  }

  export interface HardhatConfig {
    ignition: HardhatIgnitionConfig;
  }
}
